import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/d1-client", () => ({
	executeQueryFirst: vi.fn(),
}));

import { executeQueryFirst } from "@/lib/d1-client";

import {
	createUser,
	EmailInUseError,
	getUserByEmailWithCredentials,
} from "@/lib/services/user-service";

const mockDb = {} as D1Database;

describe("user-service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("createUser", () => {
		it("returns a public user when insert succeeds", async () => {
			vi.mocked(executeQueryFirst).mockResolvedValue({
				id: "uid-1",
				first_name: "Jane",
				last_name: "Doe",
				email: "jane@example.com",
			});
			const user = await createUser(mockDb, {
				firstName: "Jane",
				lastName: "Doe",
				email: "jane@example.com",
				passwordHash: "hash",
			});
			expect(user).toEqual({
				id: "uid-1",
				firstName: "Jane",
				lastName: "Doe",
				email: "jane@example.com",
			});
			expect(executeQueryFirst).toHaveBeenCalledOnce();
		});

		it("throws EmailInUseError when D1 reports unique constraint", async () => {
			vi.mocked(executeQueryFirst).mockRejectedValue(
				new Error("UNIQUE constraint failed: users.email"),
			);
			await expect(
				createUser(mockDb, {
					firstName: "J",
					lastName: "D",
					email: "taken@example.com",
					passwordHash: "hash",
				}),
			).rejects.toBeInstanceOf(EmailInUseError);
		});

		it("rethrows non-unique errors", async () => {
			vi.mocked(executeQueryFirst).mockRejectedValue(new Error("disk full"));
			await expect(
				createUser(mockDb, {
					firstName: "J",
					lastName: "D",
					email: "x@y.z",
					passwordHash: "hash",
				}),
			).rejects.toThrow("disk full");
		});
	});

	describe("getUserByEmailWithCredentials", () => {
		it("delegates to executeQueryFirst", async () => {
			const row = {
				id: "1",
				first_name: "A",
				last_name: "B",
				email: "a@b.com",
				password_hash: "h",
				created_at: "now",
				updated_at: "now",
			};
			vi.mocked(executeQueryFirst).mockResolvedValue(row);
			const out = await getUserByEmailWithCredentials(mockDb, "a@b.com");
			expect(out).toEqual(row);
		});
	});
});
