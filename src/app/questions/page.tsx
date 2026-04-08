import { redirect } from "next/navigation";
import Link from "next/link";
import { ZodError } from "zod";

import { QuestionRowActions } from "@/components/mcq/question-row-actions";
import { QuestionsPagination } from "@/components/mcq/questions-pagination";
import { QuestionsSearchForm } from "@/components/mcq/questions-search-form";
import { McqTooltipRoot } from "@/components/mcq/mcq-tooltip-root";
import { TruncatedTableCell } from "@/components/mcq/truncated-table-cell";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getSessionFromCookies } from "@/lib/auth/session-cookie";
import { getDatabase } from "@/lib/d1-client";
import {
	MCQ_TABLE_DESCRIPTION_MAX,
	MCQ_TABLE_QUESTION_TEXT_MAX,
} from "@/lib/mcq-display";
import { listMcQuestions } from "@/lib/services/mc-question-service";

function firstParam(
	value: string | string[] | undefined,
): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(iso: string): string {
	try {
		return new Date(iso).toLocaleString(undefined, {
			dateStyle: "short",
			timeStyle: "short",
		});
	} catch {
		return iso;
	}
}

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QuestionsPage({ searchParams }: PageProps) {
	const session = await getSessionFromCookies();
	if (!session) {
		redirect("/");
	}

	const sp = await searchParams;
	const qRaw = firstParam(sp.q) ?? "";
	const pageRaw = firstParam(sp.page);
	const pageSizeRaw = firstParam(sp.pageSize);

	const db = await getDatabase();
	let result;
	try {
		result = await listMcQuestions(db, session.userId, {
			page: pageRaw,
			pageSize: pageSizeRaw,
			q: qRaw || undefined,
		});
	} catch (e) {
		if (e instanceof ZodError) {
			redirect("/questions");
		}
		throw e;
	}

	const { items, page, pageSize, totalCount } = result;

	return (
		<main className="mx-auto min-h-svh max-w-6xl p-6 md:p-8">
			<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Your questions
					</h1>
					<p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
						Search, paginate, and manage multiple choice items.
					</p>
				</div>
				<Button asChild>
					<Link href="/questions/new">Add question</Link>
				</Button>
			</div>

			<Card>
				<CardHeader className="gap-2">
					<CardTitle>Question index</CardTitle>
					<CardDescription>
						List is loaded on the server from D1 using your current search and
						page settings.
					</CardDescription>
					<QuestionsSearchForm defaultQ={qRaw} pageSize={pageSize} />
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					{items.length === 0 ? (
						<div className="rounded-lg border border-dashed border-neutral-300 py-14 text-center dark:border-neutral-700">
							<p className="text-neutral-600 dark:text-neutral-400">
								{qRaw.trim()
									? "No questions match your search."
									: "You have not created any questions yet."}
							</p>
							<Button asChild className="mt-4">
								<Link href="/questions/new">Add question</Link>
							</Button>
						</div>
					) : (
						<McqTooltipRoot>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Description</TableHead>
										<TableHead>Question</TableHead>
										<TableHead className="w-24 text-right">Choices</TableHead>
										<TableHead className="w-40">Updated</TableHead>
										<TableHead className="w-36 text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{items.map((row) => (
										<TableRow key={row.id}>
											<TableCell>
												<TruncatedTableCell
													text={row.description}
													maxChars={MCQ_TABLE_DESCRIPTION_MAX}
												/>
											</TableCell>
											<TableCell>
												<TruncatedTableCell
													text={row.questionText}
													maxChars={MCQ_TABLE_QUESTION_TEXT_MAX}
												/>
											</TableCell>
											<TableCell className="text-right tabular-nums">
												{row.choiceCount}
											</TableCell>
											<TableCell className="text-sm text-neutral-600 dark:text-neutral-400">
												{formatDateTime(row.updatedAt)}
											</TableCell>
											<TableCell className="text-right">
												<QuestionRowActions questionId={row.id} />
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</McqTooltipRoot>
					)}

					{totalCount > 0 ? (
						<QuestionsPagination
							page={page}
							pageSize={pageSize}
							totalCount={totalCount}
							q={qRaw.trim() || undefined}
						/>
					) : null}
				</CardContent>
			</Card>
		</main>
	);
}
