import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAuth } from "@/lib/auth/require-session";
import { getDatabase } from "@/lib/d1-client";
import { mcQuestionListToJson, mcQuestionToJson } from "@/lib/mcq-response";
import { firstMcqZodIssueMessage } from "@/lib/schemas/mcq-api";
import {
	createMcQuestion,
	listMcQuestions,
} from "@/lib/services/mc-question-service";

export async function GET(request: NextRequest) {
	const auth = await requireAuth();
	if (!auth.ok) {
		return auth.response;
	}

	const { searchParams } = request.nextUrl;
	try {
		const db = await getDatabase();
		const result = await listMcQuestions(db, auth.userId, {
			page: searchParams.get("page") ?? undefined,
			pageSize: searchParams.get("pageSize") ?? undefined,
			q: searchParams.get("q") ?? undefined,
		});
		return NextResponse.json(mcQuestionListToJson(result));
	} catch (e) {
		if (e instanceof ZodError) {
			return NextResponse.json(
				{ error: firstMcqZodIssueMessage(e) },
				{ status: 400 },
			);
		}
		console.error(e);
		return NextResponse.json(
			{ error: "Something went wrong. Please try again." },
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	const auth = await requireAuth();
	if (!auth.ok) {
		return auth.response;
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	try {
		const db = await getDatabase();
		const created = await createMcQuestion(db, auth.userId, body);
		return NextResponse.json(mcQuestionToJson(created), { status: 201 });
	} catch (e) {
		if (e instanceof ZodError) {
			return NextResponse.json(
				{ error: firstMcqZodIssueMessage(e) },
				{ status: 400 },
			);
		}
		console.error(e);
		return NextResponse.json(
			{ error: "Something went wrong. Please try again." },
			{ status: 500 },
		);
	}
}
