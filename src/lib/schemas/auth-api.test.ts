import { describe, it, expect } from "vitest";

import { loginRequestSchema, signupRequestSchema } from "@/lib/schemas/auth-api";

describe("loginRequestSchema", () => {
	it("accepts valid credentials", () => {
		const r = loginRequestSchema.safeParse({
			email: "  User@Example.com  ",
			password: "secret",
		});
		expect(r.success).toBe(true);
		if (r.success) {
			expect(r.data.email).toBe("User@Example.com");
		}
	});

	it("rejects empty email", () => {
		const r = loginRequestSchema.safeParse({ email: "", password: "x" });
		expect(r.success).toBe(false);
	});

	it("rejects empty password", () => {
		const r = loginRequestSchema.safeParse({
			email: "a@b.com",
			password: "",
		});
		expect(r.success).toBe(false);
	});
});

describe("signupRequestSchema", () => {
	const valid = {
		firstName: "Jane",
		lastName: "Doe",
		email: "jane@example.com",
		password: "1234567890",
		confirmPassword: "1234567890",
	};

	it("accepts valid signup payload", () => {
		expect(signupRequestSchema.safeParse(valid).success).toBe(true);
	});

	it("rejects password shorter than 10 characters", () => {
		const r = signupRequestSchema.safeParse({
			...valid,
			password: "123456789",
			confirmPassword: "123456789",
		});
		expect(r.success).toBe(false);
	});

	it("rejects mismatched confirm password", () => {
		const r = signupRequestSchema.safeParse({
			...valid,
			confirmPassword: "1234567890x",
		});
		expect(r.success).toBe(false);
		if (!r.success) {
			const confirmIssue = r.error.issues.find((i) =>
				i.path.includes("confirmPassword"),
			);
			expect(confirmIssue).toBeDefined();
		}
	});

	it("rejects empty first name", () => {
		const r = signupRequestSchema.safeParse({ ...valid, firstName: "   " });
		expect(r.success).toBe(false);
	});
});
