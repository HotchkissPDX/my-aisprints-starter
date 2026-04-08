import { describe, it, expect } from "vitest";

import {
	MCQ_TABLE_DESCRIPTION_MAX,
	tableCellNeedsTooltip,
	truncateForTable,
} from "@/lib/mcq-display";

describe("mcq-display", () => {
	it("truncateForTable leaves short strings unchanged", () => {
		expect(truncateForTable("hi", 10)).toBe("hi");
	});

	it("truncateForTable adds ellipsis when longer than max", () => {
		const s = "a".repeat(10);
		expect(truncateForTable(s, 5)).toBe("aaaa…");
	});

	it("tableCellNeedsTooltip matches truncation threshold", () => {
		expect(tableCellNeedsTooltip("abc", MCQ_TABLE_DESCRIPTION_MAX)).toBe(false);
		expect(
			tableCellNeedsTooltip("x".repeat(MCQ_TABLE_DESCRIPTION_MAX + 1), MCQ_TABLE_DESCRIPTION_MAX),
		).toBe(true);
	});
});
