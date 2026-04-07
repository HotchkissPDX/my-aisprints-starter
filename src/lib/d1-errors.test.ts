import { describe, it, expect } from "vitest";

import { isUniqueConstraintError } from "@/lib/d1-errors";

describe("isUniqueConstraintError", () => {
	it("returns true for SQLite UNIQUE constraint message", () => {
		expect(
			isUniqueConstraintError(
				new Error("UNIQUE constraint failed: users.email"),
			),
		).toBe(true);
	});

	it("returns true for SQLITE_CONSTRAINT_UNIQUE substring", () => {
		expect(isUniqueConstraintError(new Error("code SQLITE_CONSTRAINT_UNIQUE"))).toBe(
			true,
		);
	});

	it("returns false for unrelated errors", () => {
		expect(isUniqueConstraintError(new Error("network failed"))).toBe(false);
		expect(isUniqueConstraintError(null)).toBe(false);
	});
});
