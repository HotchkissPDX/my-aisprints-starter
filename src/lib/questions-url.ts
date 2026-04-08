/**
 * Build `/questions` URL with query params. Omits defaults (`page` 1, `pageSize` 20).
 */
export function buildQuestionsListUrl(params: {
	q?: string;
	page?: number;
	pageSize?: number;
}): string {
	const sp = new URLSearchParams();
	const q = params.q?.trim();
	if (q) {
		sp.set("q", q);
	}
	if (params.page != null && params.page > 1) {
		sp.set("page", String(params.page));
	}
	if (params.pageSize != null && params.pageSize !== 20) {
		sp.set("pageSize", String(params.pageSize));
	}
	const qs = sp.toString();
	return qs ? `/questions?${qs}` : "/questions";
}
