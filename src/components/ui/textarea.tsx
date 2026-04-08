import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
	HTMLTextAreaElement,
	React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
	<textarea
		ref={ref}
		data-slot="textarea"
		className={cn(
			"flex min-h-[80px] w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] selection:bg-neutral-900 selection:text-white placeholder:text-neutral-500 focus-visible:border-neutral-500 focus-visible:ring-[3px] focus-visible:ring-neutral-400/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:border-neutral-600 dark:selection:bg-neutral-100 dark:selection:text-neutral-950 dark:focus-visible:ring-neutral-500/40",
			className,
		)}
		{...props}
	/>
));
Textarea.displayName = "Textarea";

export { Textarea };
