import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/d1-client", () => ({
	executeQuery: vi.fn(),
	executeQueryFirst: vi.fn(),
	executeMutation: vi.fn(),
	executeBatch: vi.fn(),
}));

import {
	executeBatch,
	executeMutation,
	executeQuery,
	executeQueryFirst,
} from "@/lib/d1-client";

import {
	createMcQuestion,
	deleteMcQuestion,
	getMcQuestionForUser,
	listMcQuestions,
	McQuestionNotFoundError,
	updateMcQuestion,
} from "@/lib/services/mc-question-service";

const mockDb = {
	prepare: vi.fn().mockReturnValue({
		bind: vi.fn().mockReturnValue({}),
	}),
} as unknown as D1Database;

const writeBody = {
	description: "Algebra",
	questionText: "What is 2+2?",
	choices: [
		{ text: "3", isCorrect: false },
		{ text: "4", isCorrect: true },
	],
};

describe("mc-question-service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("listMcQuestions", () => {
		it("returns items and totalCount without search", async () => {
			vi.mocked(executeQueryFirst).mockResolvedValueOnce({ cnt: 2 });
			vi.mocked(executeQuery).mockResolvedValueOnce([
				{
					id: "q1",
					description: "D1",
					question_text: "Q1",
					created_at: "t1",
					updated_at: "t1",
					choice_count: 2,
				},
			]);

			const out = await listMcQuestions(mockDb, "user-1", {
				page: 1,
				pageSize: 20,
			});

			expect(out.totalCount).toBe(2);
			expect(out.items).toHaveLength(1);
			expect(out.items[0]).toMatchObject({
				id: "q1",
				description: "D1",
				questionText: "Q1",
				choiceCount: 2,
			});
			expect(executeQueryFirst).toHaveBeenCalledWith(
				mockDb,
				expect.stringContaining("COUNT(*)"),
				"user-1",
			);
		});

		it("uses description filter when q is set", async () => {
			vi.mocked(executeQueryFirst).mockResolvedValueOnce({ cnt: 1 });
			vi.mocked(executeQuery).mockResolvedValueOnce([]);

			await listMcQuestions(mockDb, "user-1", { q: "exam" });

			expect(executeQueryFirst).toHaveBeenCalledWith(
				mockDb,
				expect.stringContaining("instr(lower(description)"),
				"user-1",
				"exam",
			);
		});
	});

	describe("getMcQuestionForUser", () => {
		it("returns null when question missing", async () => {
			vi.mocked(executeQueryFirst).mockResolvedValueOnce(null);
			const out = await getMcQuestionForUser(mockDb, "q1", "user-1");
			expect(out).toBeNull();
		});

		it("maps choices with isCorrect", async () => {
			vi.mocked(executeQueryFirst).mockResolvedValueOnce({
				id: "q1",
				description: "D",
				question_text: "Q",
				created_at: "c",
				updated_at: "u",
			});
			vi.mocked(executeQuery).mockResolvedValueOnce([
				{
					id: "ch1",
					choice_text: "Yes",
					is_correct: 1,
					sort_order: 0,
				},
				{
					id: "ch2",
					choice_text: "No",
					is_correct: 0,
					sort_order: 1,
				},
			]);

			const out = await getMcQuestionForUser(mockDb, "q1", "user-1");
			expect(out?.choices[0]?.isCorrect).toBe(true);
			expect(out?.choices[1]?.isCorrect).toBe(false);
		});
	});

	describe("createMcQuestion", () => {
		it("runs batch then loads full row", async () => {
			vi.mocked(executeBatch).mockResolvedValueOnce([]);
			let call = 0;
			vi.mocked(executeQueryFirst).mockImplementation(async () => {
				call += 1;
				if (call === 1) {
					return {
						id: "new-q",
						description: writeBody.description,
						question_text: writeBody.questionText,
						created_at: "now",
						updated_at: "now",
					};
				}
				return null;
			});
			vi.mocked(executeQuery).mockResolvedValueOnce([
				{
					id: "c1",
					choice_text: "3",
					is_correct: 0,
					sort_order: 0,
				},
				{
					id: "c2",
					choice_text: "4",
					is_correct: 1,
					sort_order: 1,
				},
			]);

			const out = await createMcQuestion(mockDb, "user-1", writeBody);
			expect(executeBatch).toHaveBeenCalledOnce();
			expect(out.questionText).toBe(writeBody.questionText);
			expect(out.choices).toHaveLength(2);
		});
	});

	describe("updateMcQuestion", () => {
		it("throws McQuestionNotFoundError when not owned", async () => {
			vi.mocked(executeQueryFirst).mockResolvedValueOnce(null);
			await expect(
				updateMcQuestion(mockDb, "user-1", "missing", writeBody),
			).rejects.toBeInstanceOf(McQuestionNotFoundError);
			expect(executeBatch).not.toHaveBeenCalled();
		});

		it("runs batch when row exists", async () => {
			vi.mocked(executeQueryFirst)
				.mockResolvedValueOnce({ id: "q1" })
				.mockResolvedValueOnce({
					id: "q1",
					description: writeBody.description,
					question_text: writeBody.questionText,
					created_at: "c",
					updated_at: "u",
				});
			vi.mocked(executeQuery).mockResolvedValueOnce([
				{
					id: "c1",
					choice_text: "3",
					is_correct: 0,
					sort_order: 0,
				},
				{
					id: "c2",
					choice_text: "4",
					is_correct: 1,
					sort_order: 1,
				},
			]);
			vi.mocked(executeBatch).mockResolvedValueOnce([]);

			await updateMcQuestion(mockDb, "user-1", "q1", writeBody);
			expect(executeBatch).toHaveBeenCalledOnce();
		});
	});

	describe("deleteMcQuestion", () => {
		it("returns true when a row was deleted", async () => {
			vi.mocked(executeMutation).mockResolvedValueOnce({
				success: true,
				meta: { changes: 1, duration: 0, rows_read: 0, rows_written: 0, last_row_id: 0, changed_db: true, size_after: 0 },
				results: [],
			});
			await expect(deleteMcQuestion(mockDb, "user-1", "q1")).resolves.toBe(
				true,
			);
		});

		it("returns false when no row matched", async () => {
			vi.mocked(executeMutation).mockResolvedValueOnce({
				success: true,
				meta: { changes: 0, duration: 0, rows_read: 0, rows_written: 0, last_row_id: 0, changed_db: false, size_after: 0 },
				results: [],
			});
			await expect(deleteMcQuestion(mockDb, "user-1", "q1")).resolves.toBe(
				false,
			);
		});
	});
});
