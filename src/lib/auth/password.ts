import {
	PBKDF2_ITERATIONS,
	PBKDF2_KEY_BITS,
} from "@/lib/auth/constants";
import { fromBase64Url, toBase64Url } from "@/lib/auth/encoding";

const enc = new TextEncoder();
const PREFIX = "v1";

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) {
		return false;
	}
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a[i]! ^ b[i]!;
	}
	return diff === 0;
}

/**
 * PBKDF2-SHA256 password hash for Workers / Edge (Web Crypto).
 * Stored format: `v1$<iterations>$<salt b64url>$<key b64url>`
 */
export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		enc.encode(password),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	const bits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt: new Uint8Array(salt),
			iterations: PBKDF2_ITERATIONS,
			hash: "SHA-256",
		},
		keyMaterial,
		PBKDF2_KEY_BITS,
	);
	const hash = new Uint8Array(bits);
	return `${PREFIX}$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

/**
 * Verifies a password against a string produced by {@link hashPassword}.
 */
export async function verifyPassword(
	password: string,
	stored: string,
): Promise<boolean> {
	const parts = stored.split("$");
	if (parts.length !== 4 || parts[0] !== PREFIX) {
		return false;
	}
	const iterations = Number(parts[1]);
	if (!Number.isFinite(iterations) || iterations < 1) {
		return false;
	}
	let salt: Uint8Array;
	let expected: Uint8Array;
	try {
		salt = fromBase64Url(parts[2]!);
		expected = fromBase64Url(parts[3]!);
	} catch {
		return false;
	}
	if (expected.length !== PBKDF2_KEY_BITS / 8) {
		return false;
	}
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		enc.encode(password),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	let bits: ArrayBuffer;
	try {
		bits = await crypto.subtle.deriveBits(
			{
				name: "PBKDF2",
				salt: new Uint8Array(salt),
				iterations,
				hash: "SHA-256",
			},
			keyMaterial,
			PBKDF2_KEY_BITS,
		);
	} catch {
		return false;
	}
	const actual = new Uint8Array(bits);
	return timingSafeEqual(actual, expected);
}
