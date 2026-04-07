import { describe, it, expect } from "vitest";

import { normalizePlaceholders } from "@/lib/d1-placeholders";

describe("normalizePlaceholders", () => {
	it("numbers anonymous placeholders", () => {
		expect(normalizePlaceholders("SELECT * FROM t WHERE a = ? AND b = ?")).toBe(
			"SELECT * FROM t WHERE a = ?1 AND b = ?2",
		);
	});

	it("preserves already-numbered placeholders", () => {
		expect(normalizePlaceholders("WHERE x = ?1 AND y = ?2")).toBe(
			"WHERE x = ?1 AND y = ?2",
		);
	});

	it("continues numbering after existing ?n tokens", () => {
		expect(normalizePlaceholders("WHERE x = ?1 AND y = ?")).toBe(
			"WHERE x = ?1 AND y = ?2",
		);
	});
});
