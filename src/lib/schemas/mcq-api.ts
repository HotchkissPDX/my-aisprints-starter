import { z } from "zod";

/** Conservative v1 caps (tunable in code without PRD change). */
export const MCQ_DESCRIPTION_MAX_LENGTH = 500;
export const MCQ_QUESTION_TEXT_MAX_LENGTH = 3000;
export const MCQ_CHOICE_TEXT_MAX_LENGTH = 500;

const nonEmptyTrimmed = (max: number, label: string) =>
	z
		.string()
		.trim()
		.min(1, `${label} is required`)
		.max(max, `${label} is too long`);

export const mcqChoiceInputSchema = z.object({
	text: nonEmptyTrimmed(MCQ_CHOICE_TEXT_MAX_LENGTH, "Choice text"),
	isCorrect: z.boolean(),
});

export const mcQuestionWriteBodySchema = z
	.object({
		description: nonEmptyTrimmed(
			MCQ_DESCRIPTION_MAX_LENGTH,
			"Description",
		),
		questionText: nonEmptyTrimmed(
			MCQ_QUESTION_TEXT_MAX_LENGTH,
			"Question text",
		),
		choices: z
			.array(mcqChoiceInputSchema)
			.min(2, "At least two choices are required")
			.max(6, "At most six choices are allowed"),
	})
	.superRefine((data, ctx) => {
		const correctCount = data.choices.filter((c) => c.isCorrect).length;
		if (correctCount !== 1) {
			ctx.addIssue({
				code: "custom",
				message: "Exactly one choice must be marked correct",
				path: ["choices"],
			});
		}
	});

export type McQuestionWriteInput = z.infer<typeof mcQuestionWriteBodySchema>;

function parsePositiveInt(value: unknown, fallback: number): number {
	if (value === undefined || value === "" || value === null) {
		return fallback;
	}
	const n = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(n)) {
		return fallback;
	}
	return Math.max(1, Math.floor(n));
}

export const mcQuestionListParamsSchema = z
	.object({
		page: z.union([z.number(), z.string(), z.null()]).optional(),
		pageSize: z.union([z.number(), z.string(), z.null()]).optional(),
		q: z.string().nullish().optional(),
	})
	.transform((o) => {
		const page = parsePositiveInt(o.page, 1);
		const rawSize = parsePositiveInt(o.pageSize, 20);
		const pageSize = Math.min(50, rawSize);
		const trimmed =
			o.q === undefined || o.q === null ? "" : String(o.q).trim();
		return {
			page,
			pageSize,
			q: trimmed === "" ? undefined : trimmed,
		};
	});

export type McQuestionListParams = z.infer<typeof mcQuestionListParamsSchema>;

export function parseMcQuestionWriteBody(
	data: unknown,
): McQuestionWriteInput {
	return mcQuestionWriteBodySchema.parse(data);
}

export function parseMcQuestionListParams(
	data: unknown,
): McQuestionListParams {
	return mcQuestionListParamsSchema.parse(data);
}

export function firstMcqZodIssueMessage(error: z.ZodError): string {
	return error.issues[0]?.message ?? "Validation failed";
}
