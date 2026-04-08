import "server-only";

import {
	executeBatch,
	executeMutation,
	executeQuery,
	executeQueryFirst,
} from "@/lib/d1-client";
import { normalizePlaceholders } from "@/lib/d1-placeholders";
import {
	type McQuestionWriteInput,
	parseMcQuestionListParams,
	parseMcQuestionWriteBody,
} from "@/lib/schemas/mcq-api";

export type McQuestionSummary = {
	id: string;
	description: string;
	questionText: string;
	choiceCount: number;
	createdAt: string;
	updatedAt: string;
};

export type McChoiceDto = {
	id: string;
	text: string;
	isCorrect: boolean;
	sortOrder: number;
};

export type McQuestionDto = {
	id: string;
	description: string;
	questionText: string;
	choices: McChoiceDto[];
	createdAt: string;
	updatedAt: string;
};

export type McQuestionListResult = {
	items: McQuestionSummary[];
	page: number;
	pageSize: number;
	totalCount: number;
};

export class McQuestionNotFoundError extends Error {
	readonly code = "MC_QUESTION_NOT_FOUND" as const;
	constructor() {
		super("Question not found");
		this.name = "McQuestionNotFoundError";
	}
}

type QuestionRow = {
	id: string;
	description: string;
	question_text: string;
	created_at: string;
	updated_at: string;
};

type ChoiceRow = {
	id: string;
	choice_text: string;
	is_correct: number;
	sort_order: number;
};

type SummaryRow = QuestionRow & { choice_count: number };

function randomHexId(): string {
	const buf = new Uint8Array(16);
	crypto.getRandomValues(buf);
	let hex = "";
	for (let i = 0; i < 16; i++) {
		hex += buf[i]!.toString(16).padStart(2, "0");
	}
	return hex;
}

function prepare(db: D1Database, sql: string, ...params: unknown[]) {
	return db.prepare(normalizePlaceholders(sql)).bind(...params);
}

function mapChoiceRow(row: ChoiceRow): McChoiceDto {
	return {
		id: row.id,
		text: row.choice_text,
		isCorrect: row.is_correct === 1,
		sortOrder: row.sort_order,
	};
}

function mapSummaryRow(row: SummaryRow): McQuestionSummary {
	return {
		id: row.id,
		description: row.description,
		questionText: row.question_text,
		choiceCount: row.choice_count,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

/**
 * Paginated index for one user. Search uses case-insensitive substring on `description` (`instr`).
 */
export async function listMcQuestions(
	db: D1Database,
	userId: string,
	rawParams: unknown,
): Promise<McQuestionListResult> {
	const { page, pageSize, q } = parseMcQuestionListParams(rawParams);
	const offset = (page - 1) * pageSize;

	const listSelect = `SELECT q.id, q.description, q.question_text, q.created_at, q.updated_at,
              (SELECT COUNT(*) FROM mc_question_choices c WHERE c.question_id = q.id) AS choice_count
       FROM mc_questions q
       WHERE q.user_id = ?`;

	let totalCount: number;
	let items: McQuestionSummary[];

	if (q !== undefined) {
		const countRow = await executeQueryFirst<{ cnt: number | bigint }>(
			db,
			`SELECT COUNT(*) AS cnt FROM mc_questions
       WHERE user_id = ?
         AND instr(lower(description), lower(?)) > 0`,
			userId,
			q,
		);
		totalCount = Number(countRow?.cnt ?? 0);

		const rows = await executeQuery<SummaryRow>(
			db,
			`${listSelect}
         AND instr(lower(q.description), lower(?)) > 0
       ORDER BY q.created_at DESC
       LIMIT ? OFFSET ?`,
			userId,
			q,
			pageSize,
			offset,
		);
		items = rows.map(mapSummaryRow);
	} else {
		const countRow = await executeQueryFirst<{ cnt: number | bigint }>(
			db,
			`SELECT COUNT(*) AS cnt FROM mc_questions WHERE user_id = ?`,
			userId,
		);
		totalCount = Number(countRow?.cnt ?? 0);

		const rows = await executeQuery<SummaryRow>(
			db,
			`${listSelect}
       ORDER BY q.created_at DESC
       LIMIT ? OFFSET ?`,
			userId,
			pageSize,
			offset,
		);
		items = rows.map(mapSummaryRow);
	}

	return { items, page, pageSize, totalCount };
}

export async function getMcQuestionForUser(
	db: D1Database,
	questionId: string,
	userId: string,
): Promise<McQuestionDto | null> {
	const qRow = await executeQueryFirst<QuestionRow>(
		db,
		`SELECT id, description, question_text, created_at, updated_at
     FROM mc_questions WHERE id = ? AND user_id = ?`,
		questionId,
		userId,
	);
	if (!qRow) {
		return null;
	}

	const choiceRows = await executeQuery<ChoiceRow>(
		db,
		`SELECT id, choice_text, is_correct, sort_order
     FROM mc_question_choices WHERE question_id = ?
     ORDER BY sort_order ASC`,
		questionId,
	);

	return {
		id: qRow.id,
		description: qRow.description,
		questionText: qRow.question_text,
		createdAt: qRow.created_at,
		updatedAt: qRow.updated_at,
		choices: choiceRows.map(mapChoiceRow),
	};
}

export async function createMcQuestion(
	db: D1Database,
	userId: string,
	rawBody: unknown,
): Promise<McQuestionDto> {
	const input = parseMcQuestionWriteBody(rawBody);
	return createMcQuestionValidated(db, userId, input);
}

async function createMcQuestionValidated(
	db: D1Database,
	userId: string,
	input: McQuestionWriteInput,
): Promise<McQuestionDto> {
	const questionId = randomHexId();

	const statements: D1PreparedStatement[] = [
		prepare(
			db,
			`INSERT INTO mc_questions (id, user_id, description, question_text)
       VALUES (?, ?, ?, ?)`,
			questionId,
			userId,
			input.description,
			input.questionText,
		),
	];

	for (let i = 0; i < input.choices.length; i++) {
		const c = input.choices[i]!;
		statements.push(
			prepare(
				db,
				`INSERT INTO mc_question_choices (question_id, sort_order, choice_text, is_correct)
         VALUES (?, ?, ?, ?)`,
				questionId,
				i,
				c.text,
				c.isCorrect ? 1 : 0,
			),
		);
	}

	await executeBatch(db, statements);

	const loaded = await getMcQuestionForUser(db, questionId, userId);
	if (!loaded) {
		throw new Error("createMcQuestion: row missing after batch insert");
	}
	return loaded;
}

export async function updateMcQuestion(
	db: D1Database,
	userId: string,
	questionId: string,
	rawBody: unknown,
): Promise<McQuestionDto> {
	const input = parseMcQuestionWriteBody(rawBody);
	return updateMcQuestionValidated(db, userId, questionId, input);
}

async function updateMcQuestionValidated(
	db: D1Database,
	userId: string,
	questionId: string,
	input: McQuestionWriteInput,
): Promise<McQuestionDto> {
	const existing = await executeQueryFirst<{ id: string }>(
		db,
		`SELECT id FROM mc_questions WHERE id = ? AND user_id = ?`,
		questionId,
		userId,
	);
	if (!existing) {
		throw new McQuestionNotFoundError();
	}

	const statements: D1PreparedStatement[] = [
		prepare(
			db,
			`UPDATE mc_questions
       SET description = ?, question_text = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
			input.description,
			input.questionText,
			questionId,
			userId,
		),
		prepare(
			db,
			`DELETE FROM mc_question_choices WHERE question_id = ?`,
			questionId,
		),
	];

	for (let i = 0; i < input.choices.length; i++) {
		const c = input.choices[i]!;
		statements.push(
			prepare(
				db,
				`INSERT INTO mc_question_choices (question_id, sort_order, choice_text, is_correct)
         VALUES (?, ?, ?, ?)`,
				questionId,
				i,
				c.text,
				c.isCorrect ? 1 : 0,
			),
		);
	}

	await executeBatch(db, statements);

	const loaded = await getMcQuestionForUser(db, questionId, userId);
	if (!loaded) {
		throw new Error("updateMcQuestion: row missing after batch update");
	}
	return loaded;
}

/**
 * Hard delete. Returns `true` if a row was removed, `false` if none matched.
 */
export async function deleteMcQuestion(
	db: D1Database,
	userId: string,
	questionId: string,
): Promise<boolean> {
	const result = await executeMutation(
		db,
		`DELETE FROM mc_questions WHERE id = ? AND user_id = ?`,
		questionId,
		userId,
	);
	return (result.meta?.changes ?? 0) > 0;
}
