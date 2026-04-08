import { describe, it, expect } from "vitest";
import { ZodError } from "zod";

import {
	firstMcqZodIssueMessage,
	mcQuestionListParamsSchema,
	mcQuestionWriteBodySchema,
} from "@/lib/schemas/mcq-api";

const validChoices = [
	{ text: "A", isCorrect: false },
	{ text: "B", isCorrect: true },
];

describe("mcQuestionWriteBodySchema", () => {
	it("accepts two choices with exactly one correct", () => {
		const out = mcQuestionWriteBodySchema.parse({
			description: "Unit",
			questionText: "2+2?",
			choices: validChoices,
		});
		expect(out.choices).toHaveLength(2);
	});

	it("rejects fewer than two choices", () => {
		expect(() =>
			mcQuestionWriteBodySchema.parse({
				description: "D",
				questionText: "Q",
				choices: [{ text: "Only", isCorrect: true }],
			}),
		).toThrow(ZodError);
	});

	it("rejects more than six choices", () => {
		expect(() =>
			mcQuestionWriteBodySchema.parse({
				description: "D",
				questionText: "Q",
				choices: Array.from({ length: 7 }, (_, i) => ({
					text: `C${i}`,
					isCorrect: i === 0,
				})),
			}),
		).toThrow(ZodError);
	});

	it("rejects zero or two correct flags", () => {
		expect(() =>
			mcQuestionWriteBodySchema.parse({
				description: "D",
				questionText: "Q",
				choices: [
					{ text: "A", isCorrect: false },
					{ text: "B", isCorrect: false },
				],
			}),
		).toThrow(ZodError);

		expect(() =>
			mcQuestionWriteBodySchema.parse({
				description: "D",
				questionText: "Q",
				choices: [
					{ text: "A", isCorrect: true },
					{ text: "B", isCorrect: true },
				],
			}),
		).toThrow(ZodError);
	});

	it("trims and rejects whitespace-only strings", () => {
		expect(() =>
			mcQuestionWriteBodySchema.parse({
				description: "   ",
				questionText: "Q",
				choices: validChoices,
			}),
		).toThrow(ZodError);
	});
});

describe("firstMcqZodIssueMessage", () => {
	it("returns the first issue message", () => {
		const r = mcQuestionWriteBodySchema.safeParse({
			description: "",
			questionText: "Q",
			choices: validChoices,
		});
		expect(r.success).toBe(false);
		if (!r.success) {
			expect(firstMcqZodIssueMessage(r.error)).toBeTruthy();
		}
	});
});

describe("mcQuestionListParamsSchema", () => {
	it("defaults page and pageSize", () => {
		expect(mcQuestionListParamsSchema.parse({})).toEqual({
			page: 1,
			pageSize: 20,
			q: undefined,
		});
	});

	it("caps pageSize at 50", () => {
		expect(mcQuestionListParamsSchema.parse({ pageSize: "999" })).toEqual({
			page: 1,
			pageSize: 50,
			q: undefined,
		});
	});

	it("trims empty q to undefined", () => {
		expect(mcQuestionListParamsSchema.parse({ q: "  " })).toEqual({
			page: 1,
			pageSize: 20,
			q: undefined,
		});
	});

	it("preserves non-empty q", () => {
		expect(mcQuestionListParamsSchema.parse({ q: " hello " })).toEqual({
			page: 1,
			pageSize: 20,
			q: "hello",
		});
	});

	it("treats null page and q as defaults", () => {
		expect(
			mcQuestionListParamsSchema.parse({ page: null, q: null }),
		).toEqual({
			page: 1,
			pageSize: 20,
			q: undefined,
		});
	});
});
