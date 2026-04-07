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
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { signupRequestSchema } from "@/lib/schemas/auth-api";

export function SignupForm({
	...props
}: React.ComponentProps<typeof Card>) {
	const router = useRouter();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<z.infer<typeof signupRequestSchema>>({
		resolver: zodResolver(signupRequestSchema),
		defaultValues: {
			firstName: "",
			lastName: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
	});

	async function onSubmit(values: z.infer<typeof signupRequestSchema>) {
		setServerError(null);
		try {
			const res = await fetch("/api/auth/signup", {
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
		<Card {...props}>
			<CardHeader>
				<CardTitle>Create an account</CardTitle>
				<CardDescription>
					Enter your information below to create your account
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
							name="firstName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>First name</FormLabel>
									<FormControl>
										<Input
											autoComplete="given-name"
											placeholder="Jane"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="lastName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Last name</FormLabel>
									<FormControl>
										<Input
											autoComplete="family-name"
											placeholder="Doe"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
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
									<FormDescription>
										We&apos;ll use this to contact you. We will not share
										your email with anyone else.
									</FormDescription>
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
											autoComplete="new-password"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Must be at least 10 characters long.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Confirm password</FormLabel>
									<FormControl>
										<Input
											type="password"
											autoComplete="new-password"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Please confirm your password.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormItem>
							<Button
								type="submit"
								disabled={form.formState.isSubmitting}
							>
								{form.formState.isSubmitting
									? "Creating account…"
									: "Create Account"}
							</Button>
							<p className="px-2 pt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
								Already have an account?{" "}
								<Link href="/" className="underline underline-offset-4">
									Sign in
								</Link>
							</p>
						</FormItem>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
