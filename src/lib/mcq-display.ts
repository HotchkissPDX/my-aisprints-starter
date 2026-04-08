/** Max characters shown in the questions table before ellipsis (v1 conservative). */
export const MCQ_TABLE_DESCRIPTION_MAX = 80;
export const MCQ_TABLE_QUESTION_TEXT_MAX = 100;

/**
 * Truncate for table display. Does not trim internal whitespace beyond counting runes/length.
 */
export function truncateForTable(text: string, maxChars: number): string {
	if (text.length <= maxChars) {
		return text;
	}
	return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
}

export function tableCellNeedsTooltip(text: string, maxChars: number): boolean {
	return text.length > maxChars;
}
