import { describe, it, expect } from "vitest";

import { buildQuestionsListUrl } from "@/lib/questions-url";

describe("buildQuestionsListUrl", () => {
	it("returns bare path when only defaults", () => {
		expect(buildQuestionsListUrl({})).toBe("/questions");
		expect(buildQuestionsListUrl({ page: 1, pageSize: 20 })).toBe("/questions");
	});

	it("includes q and page", () => {
		expect(buildQuestionsListUrl({ q: "exam", page: 2 })).toBe(
			"/questions?q=exam&page=2",
		);
	});

	it("omits empty q", () => {
		expect(buildQuestionsListUrl({ q: "   " })).toBe("/questions");
	});

	it("includes non-default pageSize", () => {
		expect(buildQuestionsListUrl({ pageSize: 50 })).toBe("/questions?pageSize=50");
	});
});
