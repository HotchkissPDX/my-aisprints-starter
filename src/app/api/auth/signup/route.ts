import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import { getDatabase } from "@/lib/d1-client";
import { normalizeEmail } from "@/lib/normalize-email";
import {
	firstZodIssueMessage,
	signupRequestSchema,
} from "@/lib/schemas/auth-api";
import {
	createUser,
	EmailInUseError,
} from "@/lib/services/user-service";

export async function POST(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const parsed = signupRequestSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: firstZodIssueMessage(parsed.error) },
			{ status: 400 },
		);
	}

	const { firstName, lastName, email, password } = parsed.data;
	const emailNorm = normalizeEmail(email);

	try {
		const db = await getDatabase();
		const hash = await hashPassword(password);
		const user = await createUser(db, {
			firstName,
			lastName,
			email: emailNorm,
			passwordHash: hash,
		});
		await setSessionCookie(user.id, user.email);
		return NextResponse.json({ user }, { status: 201 });
	} catch (e) {
		if (e instanceof EmailInUseError) {
			return NextResponse.json(
				{ error: "An account with this email already exists" },
				{ status: 409 },
			);
		}
		console.error(e);
		return NextResponse.json(
			{ error: "Something went wrong. Please try again." },
			{ status: 500 },
		);
	}
}
