import { describe, it, expect } from "vitest";

import { normalizeEmail } from "@/lib/normalize-email";

describe("normalizeEmail", () => {
	it("trims and lowercases", () => {
		expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
	});
});
