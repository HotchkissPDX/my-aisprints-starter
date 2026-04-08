import { notFound, redirect } from "next/navigation";

import { McQuestionWriteForm } from "@/components/mcq/mc-question-write-form";
import { getSessionFromCookies } from "@/lib/auth/session-cookie";
import { getDatabase } from "@/lib/d1-client";
import { getMcQuestionForUser } from "@/lib/services/mc-question-service";

type PageProps = {
	params: Promise<{ id: string }>;
};

export default async function EditQuestionPage({ params }: PageProps) {
	const session = await getSessionFromCookies();
	if (!session) {
		redirect("/");
	}

	const { id } = await params;
	const db = await getDatabase();
	const question = await getMcQuestionForUser(db, id, session.userId);
	if (!question) {
		notFound();
	}

	const initialValues = {
		description: question.description,
		questionText: question.questionText,
		choices: [...question.choices]
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((c) => ({ text: c.text, isCorrect: c.isCorrect })),
	};

	return (
		<main className="mx-auto min-h-svh max-w-3xl p-6 md:p-8">
			<McQuestionWriteForm
				mode="edit"
				questionId={id}
				initialValues={initialValues}
				className="pt-2"
			/>
		</main>
	);
}
