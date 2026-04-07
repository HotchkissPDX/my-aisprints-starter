import { SESSION_MAX_AGE_SEC } from "@/lib/auth/constants";
import { fromBase64Url, toBase64Url } from "@/lib/auth/encoding";

const enc = new TextEncoder();
const dec = new TextDecoder();

export type SessionPayload = {
	userId: string;
	email: string;
	/** Unix timestamp (seconds) when the session expires. */
	exp: number;
};

async function hmacKey(secret: string): Promise<CryptoKey> {
	const raw = await crypto.subtle.digest("SHA-256", enc.encode(secret));
	return crypto.subtle.importKey(
		"raw",
		raw,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

function timingSafeEqualUtf8(a: string, b: string): boolean {
	const ea = enc.encode(a);
	const eb = enc.encode(b);
	if (ea.length !== eb.length) {
		return false;
	}
	let diff = 0;
	for (let i = 0; i < ea.length; i++) {
		diff |= ea[i]! ^ eb[i]!;
	}
	return diff === 0;
}

/**
 * Build a signed session token (payload segment + HMAC-SHA256, base64url).
 */
export async function signSession(
	payload: Omit<SessionPayload, "exp"> & { exp?: number },
	secret: string,
): Promise<string> {
	const nowSec = Math.floor(Date.now() / 1000);
	const exp =
		payload.exp ?? nowSec + SESSION_MAX_AGE_SEC;
	const body: SessionPayload = {
		userId: payload.userId,
		email: payload.email,
		exp,
	};
	const payloadJson = JSON.stringify(body);
	const payloadB64 = toBase64Url(enc.encode(payloadJson));
	const key = await hmacKey(secret);
	const sig = await crypto.subtle.sign(
		"HMAC",
		key,
		enc.encode(payloadB64),
	);
	const sigB64 = toBase64Url(new Uint8Array(sig));
	return `${payloadB64}.${sigB64}`;
}

function parsePayloadJson(json: string): SessionPayload | null {
	try {
		const o = JSON.parse(json) as unknown;
		if (o === null || typeof o !== "object") {
			return null;
		}
		const rec = o as Record<string, unknown>;
		if (
			typeof rec.userId !== "string" ||
			typeof rec.email !== "string" ||
			typeof rec.exp !== "number"
		) {
			return null;
		}
		return { userId: rec.userId, email: rec.email, exp: rec.exp };
	} catch {
		return null;
	}
}

/**
 * Verifies HMAC and expiry; returns payload or `null`.
 */
export async function verifySession(
	token: string,
	secret: string,
): Promise<SessionPayload | null> {
	const dot = token.indexOf(".");
	if (dot <= 0) {
		return null;
	}
	const payloadB64 = token.slice(0, dot);
	const sigB64 = token.slice(dot + 1);
	if (!payloadB64 || !sigB64) {
		return null;
	}
	let sigBytes: Uint8Array;
	let payloadBytes: Uint8Array;
	try {
		sigBytes = fromBase64Url(sigB64);
		payloadBytes = fromBase64Url(payloadB64);
	} catch {
		return null;
	}
	const key = await hmacKey(secret);
	const ok = await crypto.subtle.verify(
		"HMAC",
		key,
		new Uint8Array(sigBytes),
		enc.encode(payloadB64),
	);
	if (!ok) {
		return null;
	}
	let json: string;
	try {
		json = dec.decode(payloadBytes);
	} catch {
		return null;
	}
	const payload = parsePayloadJson(json);
	if (!payload) {
		return null;
	}
	const now = Math.floor(Date.now() / 1000);
	if (payload.exp <= now) {
		return null;
	}
	return payload;
}

/** Constant-time string compare for cookie token vs forged value (same length tokens). */
export function sessionTokensEqual(a: string, b: string): boolean {
	return timingSafeEqualUtf8(a, b);
}
