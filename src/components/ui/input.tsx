import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"flex h-9 w-full min-w-0 rounded-md border border-neutral-300 bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] selection:bg-neutral-900 selection:text-white file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-neutral-950 dark:file:text-neutral-50 placeholder:text-neutral-500 focus-visible:border-neutral-500 focus-visible:ring-[3px] focus-visible:ring-neutral-400/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:border-neutral-600 dark:selection:bg-neutral-100 dark:selection:text-neutral-900 dark:focus-visible:ring-neutral-500/40",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
