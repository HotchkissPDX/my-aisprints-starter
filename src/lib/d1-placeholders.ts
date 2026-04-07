/**
 * Anonymous `?` → `?n`, `?n+1`, … (`?1` / `?2` already in the string are preserved; numbering continues after the highest existing index).
 */
export function normalizePlaceholders(sql: string): string {
	const numbered = [...sql.matchAll(/\?(\d+)/g)].map((m) =>
		parseInt(m[1]!, 10),
	);
	let max = numbered.length > 0 ? Math.max(...numbered) : 0;
	return sql.replace(/\?(?!\d)/g, () => `?${++max}`);
}
