"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { McqPreviewDialog } from "@/components/mcq/mcq-preview-dialog";

export function QuestionRowActions({ questionId }: { questionId: string }) {
	const router = useRouter();
	const [previewOpen, setPreviewOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	async function confirmDelete() {
		setDeleting(true);
		try {
			const res = await fetch(`/api/questions/${questionId}`, {
				method: "DELETE",
				credentials: "include",
			});
			if (res.ok) {
				setDeleteOpen(false);
				router.refresh();
			}
		} finally {
			setDeleting(false);
		}
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm">
						Actions
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem asChild>
						<Link href={`/questions/${questionId}/edit`}>Edit</Link>
					</DropdownMenuItem>
					<DropdownMenuItem
						onSelect={() => {
							setPreviewOpen(true);
						}}
					>
						Preview
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="text-red-600 focus:text-red-600 dark:text-red-400"
						onSelect={() => setDeleteOpen(true)}
					>
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<McqPreviewDialog
				questionId={questionId}
				open={previewOpen}
				onOpenChange={setPreviewOpen}
			/>

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this question?</AlertDialogTitle>
						<AlertDialogDescription>
							This permanently removes the question and all its choices. This
							cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
						<Button
							variant="destructive"
							disabled={deleting}
							onClick={() => void confirmDelete()}
						>
							{deleting ? "Deleting…" : "Delete"}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
