import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { normalizePlaceholders } from "@/lib/d1-placeholders";

export { normalizePlaceholders } from "@/lib/d1-placeholders";

export async function getDatabase(): Promise<D1Database> {
	const { env } = await getCloudflareContext({ async: true });
	const db = env.my_aisprints_db;
	if (!db) {
		throw new Error("D1 binding my_aisprints_db is not configured");
	}
	return db;
}

export async function executeQuery<T>(
	db: D1Database,
	sql: string,
	...params: unknown[]
): Promise<T[]> {
	const normalized = normalizePlaceholders(sql);
	const stmt = db.prepare(normalized).bind(...params);
	const { results } = await stmt.all();
	return results as T[];
}

/**
 * Prefer over `stmt.first()` per project D1 rules: uses `all()` then first row.
 */
export async function executeQueryFirst<T>(
	db: D1Database,
	sql: string,
	...params: unknown[]
): Promise<T | null> {
	const rows = await executeQuery<T>(db, sql, ...params);
	return rows[0] ?? null;
}

export async function executeMutation(
	db: D1Database,
	sql: string,
	...params: unknown[]
): Promise<D1Result> {
	const normalized = normalizePlaceholders(sql);
	return db.prepare(normalized).bind(...params).run();
}

export async function executeBatch(
	db: D1Database,
	statements: D1PreparedStatement[],
): Promise<D1Result[]> {
	return db.batch(statements);
}
