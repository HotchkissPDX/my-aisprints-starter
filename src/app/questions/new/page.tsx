import { redirect } from "next/navigation";

import { McQuestionWriteForm } from "@/components/mcq/mc-question-write-form";
import { getSessionFromCookies } from "@/lib/auth/session-cookie";

export default async function NewQuestionPage() {
	const session = await getSessionFromCookies();
	if (!session) {
		redirect("/");
	}

	return (
		<main className="mx-auto min-h-svh max-w-3xl p-6 md:p-8">
			<McQuestionWriteForm mode="create" className="pt-2" />
		</main>
	);
}
