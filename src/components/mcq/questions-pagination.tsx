import Link from "next/link";

import { Button } from "@/components/ui/button";
import { buildQuestionsListUrl } from "@/lib/questions-url";

export function QuestionsPagination({
	page,
	pageSize,
	totalCount,
	q,
}: {
	page: number;
	pageSize: number;
	totalCount: number;
	q?: string;
}) {
	const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
	const hasPrev = page > 1;
	const hasNext = page < totalPages;

	return (
		<div className="flex flex-wrap items-center gap-3">
			{hasPrev ? (
				<Button variant="outline" size="sm" asChild>
					<Link
						href={buildQuestionsListUrl({
							q,
							page: page - 1,
							pageSize,
						})}
					>
						Previous
					</Link>
				</Button>
			) : (
				<Button variant="outline" size="sm" disabled>
					Previous
				</Button>
			)}
			<span className="text-sm text-neutral-600 dark:text-neutral-400">
				Page {page} of {totalPages}
				{totalCount > 0 ? (
					<span className="text-neutral-400 dark:text-neutral-500">
						{" "}
						({totalCount} total)
					</span>
				) : null}
			</span>
			{hasNext ? (
				<Button variant="outline" size="sm" asChild>
					<Link
						href={buildQuestionsListUrl({
							q,
							page: page + 1,
							pageSize,
						})}
					>
						Next
					</Link>
				</Button>
			) : (
				<Button variant="outline" size="sm" disabled>
					Next
				</Button>
			)}
		</div>
	);
}
