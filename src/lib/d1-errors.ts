/**
 * Detects SQLite / D1 unique constraint failures after an INSERT (etc.).
 */
export function isUniqueConstraintError(error: unknown): boolean {
	const msg = error instanceof Error ? error.message : String(error);
	return (
		/UNIQUE constraint failed/i.test(msg) ||
		/SQLITE_CONSTRAINT_UNIQUE/i.test(msg) ||
		/D1_ERROR.*constraint/i.test(msg)
	);
}
