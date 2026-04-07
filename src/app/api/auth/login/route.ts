import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import { getDatabase } from "@/lib/d1-client";
import { normalizeEmail } from "@/lib/normalize-email";
import {
	firstZodIssueMessage,
	loginRequestSchema,
} from "@/lib/schemas/auth-api";
import { getUserByEmailWithCredentials } from "@/lib/services/user-service";

export async function POST(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const parsed = loginRequestSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: firstZodIssueMessage(parsed.error) },
			{ status: 400 },
		);
	}

	const { email, password } = parsed.data;
	const emailNorm = normalizeEmail(email);

	try {
		const db = await getDatabase();
		const row = await getUserByEmailWithCredentials(db, emailNorm);
		if (
			row === null ||
			!(await verifyPassword(password, row.password_hash))
		) {
			return NextResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 },
			);
		}
		await setSessionCookie(row.id, row.email);
		return NextResponse.json({
			user: {
				id: row.id,
				email: row.email,
				firstName: row.first_name,
				lastName: row.last_name,
			},
		});
	} catch (e) {
		console.error(e);
		return NextResponse.json(
			{ error: "Something went wrong. Please try again." },
			{ status: 500 },
		);
	}
}
