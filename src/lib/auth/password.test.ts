import { describe, it, expect } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hashPassword / verifyPassword", () => {
	it("round-trips a password", async () => {
		const stored = await hashPassword("correct horse battery staple");
		expect(await verifyPassword("correct horse battery staple", stored)).toBe(
			true,
		);
	});

	it("rejects wrong password", async () => {
		const stored = await hashPassword("secret-password-10+");
		expect(await verifyPassword("wrong-password-10+", stored)).toBe(false);
	});

	it("rejects malformed stored strings", async () => {
		expect(await verifyPassword("any", "")).toBe(false);
		expect(await verifyPassword("any", "v2$100000$xx$yy")).toBe(false);
		expect(await verifyPassword("any", "not-a-hash")).toBe(false);
	});
});
