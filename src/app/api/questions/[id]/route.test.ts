import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/require-session", () => ({
	requireAuth: vi.fn(),
}));

vi.mock("@/lib/d1-client", () => ({
	getDatabase: vi.fn(),
}));

vi.mock("@/lib/services/mc-question-service", async (importOriginal) => {
	const actual = await importOriginal<
		typeof import("@/lib/services/mc-question-service")
	>();
	return {
		...actual,
		getMcQuestionForUser: vi.fn(),
		updateMcQuestion: vi.fn(),
		deleteMcQuestion: vi.fn(),
	};
});

import { requireAuth } from "@/lib/auth/require-session";
import { getDatabase } from "@/lib/d1-client";
import {
	deleteMcQuestion,
	getMcQuestionForUser,
	McQuestionNotFoundError,
	updateMcQuestion,
} from "@/lib/services/mc-question-service";

import { DELETE, GET, PUT } from "./route";

const mockDb = {} as D1Database;

const fullQuestion = {
	id: "q1",
	description: "D",
	questionText: "Q",
	createdAt: "c",
	updatedAt: "u",
	choices: [
		{ id: "c1", text: "a", isCorrect: false, sortOrder: 0 },
		{ id: "c2", text: "b", isCorrect: true, sortOrder: 1 },
	],
};

function ctx(id: string) {
	return { params: Promise.resolve({ id }) };
}

describe("/api/questions/[id]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getDatabase).mockResolvedValue(mockDb);
	});

	describe("GET", () => {
		it("returns 401 when not authenticated", async () => {
			vi.mocked(requireAuth).mockResolvedValue({
				ok: false,
				response: NextResponse.json({ error: "Unauthorized" }, {
					status: 401,
				}),
			});
			const res = await GET(
				new Request("http://localhost/api/questions/q1"),
				ctx("q1"),
			);
			expect(res.status).toBe(401);
		});

		it("returns 404 when question not found", async () => {
			vi.mocked(requireAuth).mockResolvedValue({ ok: true, userId: "u1" });
			vi.mocked(getMcQuestionForUser).mockResolvedValue(null);
			const res = await GET(
				new Request("http://localhost/api/questions/missing"),
				ctx("missing"),
			);
			expect(res.status).toBe(404);
			expect(getMcQuestionForUser).toHaveBeenCalledWith(
				mockDb,
				"missing",
				"u1",
			);
		});

		it("returns 200 with full question", async () => {
			vi.mocked(requireAuth).mockResolvedValue({ ok: true, userId: "u1" });
			vi.mocked(getMcQuestionForUser).mockResolvedValue(fullQuestion);
			const res = await GET(
				new Request("http://localhost/api/questions/q1"),
				ctx("q1"),
			);
			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.id).toBe("q1");
			expect(json.choices[1].isCorrect).toBe(true);
		});
	});

	describe("PUT", () => {
		it("returns 404 when update target missing", async () => {
			vi.mocked(requireAuth).mockResolvedValue({ ok: true, userId: "u1" });
			vi.mocked(updateMcQuestion).mockRejectedValue(
				new McQuestionNotFoundError(),
			);
			const body = {
				description: "D",
				questionText: "Q",
				choices: [
					{ text: "a", isCorrect: false },
					{ text: "b", isCorrect: true },
				],
			};
			const res = await PUT(
				new Request("http://localhost/api/questions/x", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				}),
				ctx("x"),
			);
			expect(res.status).toBe(404);
		});

		it("returns 200 when update succeeds", async () => {
			vi.mocked(requireAuth).mockResolvedValue({ ok: true, userId: "u1" });
			vi.mocked(updateMcQuestion).mockResolvedValue(fullQuestion);
			const body = {
				description: "D",
				questionText: "Q",
				choices: [
					{ text: "a", isCorrect: false },
					{ text: "b", isCorrect: true },
				],
			};
			const res = await PUT(
				new Request("http://localhost/api/questions/q1", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				}),
				ctx("q1"),
			);
			expect(res.status).toBe(200);
		});
	});

	describe("DELETE", () => {
		it("returns 204 when delete succeeds", async () => {
			vi.mocked(requireAuth).mockResolvedValue({ ok: true, userId: "u1" });
			vi.mocked(deleteMcQuestion).mockResolvedValue(true);
			const res = await DELETE(
				new Request("http://localhost/api/questions/q1", {
					method: "DELETE",
				}),
				ctx("q1"),
			);
			expect(res.status).toBe(204);
		});

		it("returns 404 when no row deleted", async () => {
			vi.mocked(requireAuth).mockResolvedValue({ ok: true, userId: "u1" });
			vi.mocked(deleteMcQuestion).mockResolvedValue(false);
			const res = await DELETE(
				new Request("http://localhost/api/questions/x", {
					method: "DELETE",
				}),
				ctx("x"),
			);
			expect(res.status).toBe(404);
		});
	});
});
