"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { loginRequestSchema } from "@/lib/schemas/auth-api";
import { cn } from "@/lib/utils";

export function LoginForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const router = useRouter();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<z.infer<typeof loginRequestSchema>>({
		resolver: zodResolver(loginRequestSchema),
		defaultValues: { email: "", password: "" },
	});

	async function onSubmit(values: z.infer<typeof loginRequestSchema>) {
		setServerError(null);
		try {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(values),
			});
			const data = (await res.json().catch(() => ({}))) as {
				error?: string;
			};
			if (!res.ok) {
				setServerError(data.error ?? "Something went wrong");
				return;
			}
			router.push("/questions");
			router.refresh();
		} catch {
			setServerError("Something went wrong");
		}
	}

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle>Login to your account</CardTitle>
					<CardDescription>
						Enter your email below to login to your account
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="grid gap-4"
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
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input
												type="email"
												placeholder="m@example.com"
												autoComplete="email"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Password</FormLabel>
										<FormControl>
											<Input
												type="password"
												autoComplete="current-password"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormItem>
								<Button
									type="submit"
									disabled={form.formState.isSubmitting}
								>
									{form.formState.isSubmitting ? "Logging in…" : "Login"}
								</Button>
								<p className="pt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
									Don&apos;t have an account?{" "}
									<Link
										href="/signup"
										className="underline underline-offset-4"
									>
										Sign up
									</Link>
								</p>
							</FormItem>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
