"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

type ChoiceJson = {
	id: string;
	text: string;
	isCorrect: boolean;
	sortOrder: number;
};

type QuestionJson = {
	id: string;
	description: string;
	questionText: string;
	choices: ChoiceJson[];
};

export function McqPreviewDialog({
	questionId,
	open,
	onOpenChange,
}: {
	questionId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [data, setData] = useState<QuestionJson | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState("");
	const [submitted, setSubmitted] = useState(false);

	useEffect(() => {
		if (!open || !questionId) {
			setData(null);
			setError(null);
			setSelected("");
			setSubmitted(false);
			return;
		}
		let cancelled = false;
		setLoading(true);
		setError(null);
		fetch(`/api/questions/${questionId}`, { credentials: "include" })
			.then(async (res) => {
				const body: unknown = await res.json().catch(() => ({}));
				if (!res.ok) {
					const err = body as { error?: string };
					throw new Error(err.error ?? res.statusText);
				}
				return body as QuestionJson;
			})
			.then((q) => {
				if (!cancelled) {
					setData(q);
				}
			})
			.catch((e: unknown) => {
				if (!cancelled) {
					setError(e instanceof Error ? e.message : "Failed to load");
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [open, questionId]);

	const correctChoiceId = data?.choices.find((c) => c.isCorrect)?.id;
	const answeredCorrectly =
		submitted && Boolean(selected) && selected === correctChoiceId;
	const answeredWrong =
		submitted && Boolean(selected) && selected !== correctChoiceId;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Preview question</DialogTitle>
					<DialogDescription>
						Pick one answer, then check whether you got it right.
					</DialogDescription>
				</DialogHeader>
				{loading ? (
					<p className="text-sm text-neutral-500">Loading…</p>
				) : null}
				{error ? <p className="text-sm text-red-600">{error}</p> : null}
				{data && !loading ? (
					<div className="space-y-4">
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							{data.description}
						</p>
						<p className="font-medium leading-snug">{data.questionText}</p>
						<RadioGroup
							value={selected}
							onValueChange={(v) => {
								setSelected(v);
								setSubmitted(false);
							}}
							className="gap-3"
						>
							{data.choices
								.slice()
								.sort((a, b) => a.sortOrder - b.sortOrder)
								.map((c) => {
									const choiceId = `mcq-preview-${c.id}`;
									let box = "rounded-md border border-transparent p-3 transition-colors";
									if (submitted && c.isCorrect) {
										box +=
											" border-green-600 bg-green-50 dark:border-green-500 dark:bg-green-950/50";
									} else if (submitted && answeredWrong && c.id === selected) {
										box +=
											" border-red-600 bg-red-50 dark:border-red-500 dark:bg-red-950/50";
									}
									return (
										<div key={c.id} className={box}>
											<div className="flex items-start gap-3">
												<RadioGroupItem
													value={c.id}
													id={choiceId}
													disabled={submitted}
												/>
												<Label
													htmlFor={choiceId}
													className="cursor-pointer font-normal leading-relaxed"
												>
													{c.text}
												</Label>
											</div>
										</div>
									);
								})}
						</RadioGroup>
						{submitted ? (
							<p
								className={cn(
									"text-sm font-medium",
									answeredCorrectly
										? "text-green-700 dark:text-green-400"
										: "text-red-700 dark:text-red-400",
								)}
							>
								{answeredCorrectly
									? "Correct."
									: "Incorrect — the correct choice is highlighted."}
							</p>
						) : null}
						<Button
							type="button"
							disabled={!selected || submitted}
							onClick={() => setSubmitted(true)}
						>
							Check answer
						</Button>
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
