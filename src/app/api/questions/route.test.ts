import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

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
		listMcQuestions: vi.fn(),
		createMcQuestion: vi.fn(),
	};
});

import { requireAuth } from "@/lib/auth/require-session";
import { getDatabase } from "@/lib/d1-client";
import {
	createMcQuestion,
	listMcQuestions,
} from "@/lib/services/mc-question-service";

import { GET, POST } from "./route";

const mockDb = {} as D1Database;

describe("/api/questions", () => {
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
			const req = new NextRequest("http://localhost/api/questions");
			const res = await GET(req);
			expect(res.status).toBe(401);
		});

		it("returns 200 and serialized list when authenticated", async () => {
			vi.mocked(requireAuth).mockResolvedValue({ ok: true, userId: "u1" });
			vi.mocked(listMcQuestions).mockResolvedValue({
				items: [
					{
						id: "q1",
						description: "D",
						questionText: "Q",
						choiceCount: 2,
						createdAt: "c",
						updatedAt: "u",
					},
				],
				page: 1,
				pageSize: 20,
				totalCount: 1,
			});

			const req = new NextRequest("http://localhost/api/questions?page=1");
			const res = await GET(req);
			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.items).toHaveLength(1);
			expect(json.items[0].questionText).toBe("Q");
			expect(json.totalCount).toBe(1);
			expect(listMcQuestions).toHaveBeenCalledWith(mockDb, "u1", {
				page: "1",
				pageSize: undefined,
				q: undefined,
			});
		});
	});

	describe("POST", () => {
		it("returns 401 when not authenticated", async () => {
			vi.mocked(requireAuth).mockResolvedValue({
				ok: false,
				response: NextResponse.json({ error: "Unauthorized" }, {
					status: 401,
				}),
			});
			const res = await POST(
				new Request("http://localhost/api/questions", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({}),
				}),
			);
			expect(res.status).toBe(401);
		});

		it("returns 400 for invalid JSON", async () => {
			vi.mocked(requireAuth).mockResolvedValue({ ok: true, userId: "u1" });
			const res = await POST(
				new Request("http://localhost/api/questions", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: "not-json",
				}),
			);
			expect(res.status).toBe(400);
		});

		it("returns 201 when create succeeds", async () => {
			vi.mocked(requireAuth).mockResolvedValue({ ok: true, userId: "u1" });
			const body = {
				description: "D",
				questionText: "Q",
				choices: [
					{ text: "a", isCorrect: false },
					{ text: "b", isCorrect: true },
				],
			};
			vi.mocked(createMcQuestion).mockResolvedValue({
				id: "new",
				description: "D",
				questionText: "Q",
				createdAt: "c",
				updatedAt: "c",
				choices: [
					{ id: "c1", text: "a", isCorrect: false, sortOrder: 0 },
					{ id: "c2", text: "b", isCorrect: true, sortOrder: 1 },
				],
			});

			const res = await POST(
				new Request("http://localhost/api/questions", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				}),
			);

			expect(res.status).toBe(201);
			const json = await res.json();
			expect(json.id).toBe("new");
			expect(json.choices).toHaveLength(2);
			expect(createMcQuestion).toHaveBeenCalledWith(mockDb, "u1", body);
		});
	});
});
