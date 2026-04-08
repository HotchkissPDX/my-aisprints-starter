"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";

import { cn } from "@/lib/utils";

function RadioGroup({
	className,
	...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
	return (
		<RadioGroupPrimitive.Root
			data-slot="radio-group"
			className={cn("grid gap-2", className)}
			{...props}
		/>
	);
}

function RadioGroupItem({
	className,
	...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
	return (
		<RadioGroupPrimitive.Item
			data-slot="radio-group-item"
			className={cn(
				"aspect-square size-4 shrink-0 rounded-full border border-neutral-300 text-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:focus-visible:ring-offset-neutral-950",
				className,
			)}
			{...props}
		>
			<RadioGroupPrimitive.Indicator className="flex items-center justify-center text-current">
				<Circle className="size-2.5 fill-current" />
			</RadioGroupPrimitive.Indicator>
		</RadioGroupPrimitive.Item>
	);
}

export { RadioGroup, RadioGroupItem };
