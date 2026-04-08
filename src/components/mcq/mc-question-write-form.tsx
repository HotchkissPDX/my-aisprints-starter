"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
	MCQ_CHOICE_TEXT_MAX_LENGTH,
	MCQ_DESCRIPTION_MAX_LENGTH,
	MCQ_QUESTION_TEXT_MAX_LENGTH,
	mcQuestionWriteBodySchema,
	type McQuestionWriteInput,
} from "@/lib/schemas/mcq-api";
import { cn } from "@/lib/utils";

const defaultCreateValues: McQuestionWriteInput = {
	description: "",
	questionText: "",
	choices: [
		{ text: "", isCorrect: true },
		{ text: "", isCorrect: false },
	],
};

function ensureExactlyOneCorrect(
	choices: McQuestionWriteInput["choices"],
): McQuestionWriteInput["choices"] {
	const idx = choices.findIndex((c) => c.isCorrect);
	const correctAt = idx === -1 ? 0 : idx;
	return choices.map((c, i) => ({
		...c,
		isCorrect: i === correctAt,
	}));
}

export type McQuestionWriteFormProps = {
	mode: "create" | "edit";
	questionId?: string;
	initialValues?: McQuestionWriteInput;
	className?: string;
};

export function McQuestionWriteForm({
	mode,
	questionId,
	initialValues,
	className,
}: McQuestionWriteFormProps) {
	const router = useRouter();
	const [serverError, setServerError] = useState<string | null>(null);
	/** Avoid SSR/client hydration mismatch: `useFieldArray` `field.id` values differ on server vs client. */
	const [choicesUiReady, setChoicesUiReady] = useState(false);
	useEffect(() => {
		setChoicesUiReady(true);
	}, []);

	const resolvedDefaults = useMemo(
		() =>
			initialValues
				? {
						...initialValues,
						choices: ensureExactlyOneCorrect(initialValues.choices),
					}
				: defaultCreateValues,
		[initialValues],
	);

	const form = useForm<z.infer<typeof mcQuestionWriteBodySchema>>({
		resolver: zodResolver(mcQuestionWriteBodySchema),
		defaultValues: defaultCreateValues,
		values: mode === "edit" ? resolvedDefaults : undefined,
	});

	const { fields, append } = useFieldArray({
		control: form.control,
		name: "choices",
	});

	const choicesWatch = useWatch({ control: form.control, name: "choices" });
	const correctIndex = useMemo(() => {
		const list = choicesWatch ?? [];
		const idx = list.findIndex((c) => c.isCorrect);
		return idx === -1 ? 0 : idx;
	}, [choicesWatch]);

	function setCorrectIndex(index: number) {
		const current = form.getValues("choices");
		const next = current.map((c, i) => ({
			...c,
			isCorrect: i === index,
		}));
		form.setValue("choices", next, { shouldValidate: true });
	}

	function handleRemoveChoice(index: number) {
		const current = form.getValues("choices");
		if (current.length <= 2) {
			return;
		}
		const next = current.filter((_, i) => i !== index);
		form.setValue("choices", ensureExactlyOneCorrect(next), {
			shouldValidate: true,
		});
	}

	function handleAppendChoice() {
		if (fields.length >= 6) {
			return;
		}
		append({ text: "", isCorrect: false });
	}

	async function onSubmit(values: McQuestionWriteInput) {
		setServerError(null);
		const url =
			mode === "create"
				? "/api/questions"
				: `/api/questions/${questionId ?? ""}`;
		const method = mode === "create" ? "POST" : "PUT";

		try {
			const res = await fetch(url, {
				method,
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(values),
			});
			const data = (await res.json().catch(() => ({}))) as {
				error?: string;
			};
			if (res.status === 401) {
				setServerError(data.error ?? "Your session expired. Please sign in again.");
				return;
			}
			if (!res.ok) {
				setServerError(data.error ?? "Something went wrong. Please try again.");
				return;
			}
			router.push("/questions");
			router.refresh();
		} catch {
			setServerError("Something went wrong. Please try again.");
		}
	}

	const title = mode === "create" ? "New question" : "Edit question";
	const description =
		mode === "create"
			? "Add a short description, the question, and 2–6 answer choices. Mark exactly one as correct."
			: "Update the description, question text, or choices. Exactly one choice must stay marked correct.";

	return (
		<div className={cn("mx-auto max-w-2xl", className)}>
			<Card>
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="grid gap-6"
						>
							{serverError ? (
								<p
									className="text-sm font-medium text-red-600 dark:text-red-400"
									role="alert"
								>
									{serverError}
								</p>
							) : null}

							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Description</FormLabel>
										<FormControl>
											<Textarea
												placeholder="e.g. Unit 3 review — photosynthesis"
												maxLength={MCQ_DESCRIPTION_MAX_LENGTH}
												rows={2}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="questionText"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Question</FormLabel>
										<FormControl>
											<Textarea
												placeholder="The full question shown to students"
												maxLength={MCQ_QUESTION_TEXT_MAX_LENGTH}
												rows={5}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid gap-3">
								<Label className="text-base">Choices</Label>
								<p className="text-sm text-neutral-500 dark:text-neutral-400">
									Select the radio next to the correct answer. Between 2 and 6
									choices ({MCQ_CHOICE_TEXT_MAX_LENGTH} characters max each).
								</p>
								{!choicesUiReady ? (
									<>
										<div
											className="grid gap-4"
											aria-busy="true"
											aria-label="Loading choice editors"
										>
											{Array.from({ length: fields.length }, (_, i) => (
												<div
													key={i}
													className="flex min-h-[52px] flex-col gap-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-700 sm:flex-row sm:items-center"
												>
													<div className="size-4 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-700" />
													<div className="h-9 flex-1 rounded-md bg-neutral-100 dark:bg-neutral-800" />
												</div>
											))}
										</div>
										<Button
											type="button"
											variant="outline"
											disabled
											className="w-fit"
										>
											Add choice
										</Button>
									</>
								) : (
									<>
										<FormField
											control={form.control}
											name="choices"
											render={() => (
												<FormItem>
													<FormControl>
														<RadioGroup
															value={String(correctIndex)}
															onValueChange={(v) =>
																setCorrectIndex(Number.parseInt(v, 10))
															}
															className="grid gap-4"
														>
															{fields.map((field, index) => (
																<div
																	key={field.id}
																	className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-700 sm:flex-row sm:items-start sm:gap-3"
																>
																	<div className="flex items-center gap-2 pt-1 sm:flex-col sm:items-center sm:pt-2">
																		<RadioGroupItem
																			value={String(index)}
																			id={`mcq-correct-${index}`}
																			aria-label={`Choice ${index + 1} is correct`}
																		/>
																	</div>
																	<div className="min-w-0 flex-1">
																		<FormField
																			control={form.control}
																			name={`choices.${index}.text`}
																			render={({ field: textField }) => (
																				<FormItem>
																					<FormLabel className="sr-only">
																						Choice {index + 1} text
																					</FormLabel>
																					<FormControl>
																						<Input
																							placeholder={`Choice ${index + 1}`}
																							maxLength={
																								MCQ_CHOICE_TEXT_MAX_LENGTH
																							}
																							{...textField}
																						/>
																					</FormControl>
																					<FormMessage />
																				</FormItem>
																			)}
																		/>
																	</div>
																	<Button
																		type="button"
																		variant="outline"
																		size="sm"
																		className="shrink-0 self-end sm:self-start"
																		disabled={fields.length <= 2}
																		onClick={() => handleRemoveChoice(index)}
																	>
																		Remove
																	</Button>
																</div>
															))}
														</RadioGroup>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<Button
											type="button"
											variant="outline"
											disabled={fields.length >= 6}
											onClick={handleAppendChoice}
											className="w-fit"
										>
											Add choice
										</Button>
									</>
								)}
							</div>

							<div className="flex flex-wrap gap-3 pt-2">
								<Button type="submit" disabled={form.formState.isSubmitting}>
									{form.formState.isSubmitting
										? "Saving…"
										: mode === "create"
											? "Create question"
											: "Save changes"}
								</Button>
								<Button asChild variant="outline" type="button">
									<Link href="/questions">Cancel</Link>
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
