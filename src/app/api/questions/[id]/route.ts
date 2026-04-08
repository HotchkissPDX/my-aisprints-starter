import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAuth } from "@/lib/auth/require-session";
import { getDatabase } from "@/lib/d1-client";
import { mcQuestionToJson } from "@/lib/mcq-response";
import { firstMcqZodIssueMessage } from "@/lib/schemas/mcq-api";
import {
	deleteMcQuestion,
	getMcQuestionForUser,
	McQuestionNotFoundError,
	updateMcQuestion,
} from "@/lib/services/mc-question-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
	const auth = await requireAuth();
	if (!auth.ok) {
		return auth.response;
	}

	const { id } = await context.params;

	try {
		const db = await getDatabase();
		const question = await getMcQuestionForUser(db, id, auth.userId);
		if (!question) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		return NextResponse.json(mcQuestionToJson(question));
	} catch (e) {
		console.error(e);
		return NextResponse.json(
			{ error: "Something went wrong. Please try again." },
			{ status: 500 },
		);
	}
}

export async function PUT(request: Request, context: RouteContext) {
	const auth = await requireAuth();
	if (!auth.ok) {
		return auth.response;
	}

	const { id } = await context.params;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	try {
		const db = await getDatabase();
		const updated = await updateMcQuestion(db, auth.userId, id, body);
		return NextResponse.json(mcQuestionToJson(updated));
	} catch (e) {
		if (e instanceof McQuestionNotFoundError) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
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

export async function DELETE(_request: Request, context: RouteContext) {
	const auth = await requireAuth();
	if (!auth.ok) {
		return auth.response;
	}

	const { id } = await context.params;

	try {
		const db = await getDatabase();
		const deleted = await deleteMcQuestion(db, auth.userId, id);
		if (!deleted) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		return new NextResponse(null, { status: 204 });
	} catch (e) {
		console.error(e);
		return NextResponse.json(
			{ error: "Something went wrong. Please try again." },
			{ status: 500 },
		);
	}
}
