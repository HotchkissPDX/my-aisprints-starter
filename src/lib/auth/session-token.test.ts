import { describe, it, expect, vi, afterEach } from "vitest";

import { toBase64Url } from "@/lib/auth/encoding";
import { signSession, verifySession } from "@/lib/auth/session-token";

const SECRET = "unit-test-auth-secret-at-least-32-characters";

describe("signSession / verifySession", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("round-trips payload with default expiry", async () => {
		const token = await signSession(
			{ userId: "user-1", email: "a@b.com" },
			SECRET,
		);
		const payload = await verifySession(token, SECRET);
		expect(payload).toMatchObject({
			userId: "user-1",
			email: "a@b.com",
		});
		expect(payload!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
	});

	it("returns null for wrong secret", async () => {
		const token = await signSession(
			{ userId: "u", email: "x@y.z" },
			SECRET,
		);
		expect(await verifySession(token, "other-secret-also-32-chars-min!!")).toBe(
			null,
		);
	});

	it("returns null for tampered token", async () => {
		const token = await signSession(
			{ userId: "u", email: "x@y.z" },
			SECRET,
		);
		const tampered = token.slice(0, -4) + "xxxx";
		expect(await verifySession(tampered, SECRET)).toBe(null);
	});

	it("returns null when expired", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2020-01-01T00:00:00Z"));
		const pastExp = Math.floor(Date.now() / 1000) + 60;
		const token = await signSession(
			{ userId: "u", email: "x@y.z", exp: pastExp },
			SECRET,
		);
		vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
		expect(await verifySession(token, SECRET)).toBe(null);
	});

	it("returns null for invalid JSON payload shape", async () => {
		const enc = new TextEncoder();
		const badJson = toBase64Url(enc.encode(JSON.stringify({ foo: 1 })));
		const key = await crypto.subtle.importKey(
			"raw",
			await crypto.subtle.digest("SHA-256", enc.encode(SECRET)),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
		const sig = await crypto.subtle.sign(
			"HMAC",
			key,
			enc.encode(badJson),
		);
		const token = `${badJson}.${toBase64Url(new Uint8Array(sig))}`;
		expect(await verifySession(token, SECRET)).toBe(null);
	});
});
