import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildQuestionsListUrl } from "@/lib/questions-url";

export function QuestionsSearchForm({
	defaultQ,
	pageSize,
}: {
	defaultQ: string;
	pageSize: number;
}) {
	const hasQ = defaultQ.trim().length > 0;

	return (
		<form
			method="get"
			action="/questions"
			className="flex flex-wrap items-end gap-2"
		>
			<input type="hidden" name="page" value="1" />
			{pageSize !== 20 ? (
				<input type="hidden" name="pageSize" value={pageSize} />
			) : null}
			<div className="flex flex-col gap-1.5">
				<label
					htmlFor="mcq-search-q"
					className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
				>
					Search descriptions
				</label>
				<Input
					id="mcq-search-q"
					name="q"
					defaultValue={defaultQ}
					placeholder="Substring…"
					className="w-72"
					autoComplete="off"
				/>
			</div>
			<Button type="submit">Search</Button>
			{hasQ ? (
				<Button variant="outline" asChild>
					<Link href={buildQuestionsListUrl({ pageSize })}>Clear</Link>
				</Button>
			) : null}
		</form>
	);
}
