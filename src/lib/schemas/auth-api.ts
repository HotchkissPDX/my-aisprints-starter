import { z } from "zod";

export const signupRequestSchema = z
	.object({
		firstName: z.string().trim().min(1, "First name is required"),
		lastName: z.string().trim().min(1, "Last name is required"),
		email: z.string().trim().email("Invalid email address"),
		password: z.string().min(10, "Password must be at least 10 characters"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export const loginRequestSchema = z.object({
	email: z
		.string()
		.trim()
		.min(1, "Email is required")
		.email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
});

export function firstZodIssueMessage(error: z.ZodError): string {
	return error.issues[0]?.message ?? "Validation failed";
}
