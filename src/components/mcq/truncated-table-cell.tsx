"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	tableCellNeedsTooltip,
	truncateForTable,
} from "@/lib/mcq-display";
import { cn } from "@/lib/utils";

type TruncatedTableCellProps = {
	text: string;
	maxChars: number;
	className?: string;
};

/**
 * Table cell: truncates long text; shows full value in a Tooltip when truncated.
 */
export function TruncatedTableCell({
	text,
	maxChars,
	className,
}: TruncatedTableCellProps) {
	const needsTip = tableCellNeedsTooltip(text, maxChars);
	const display = truncateForTable(text, maxChars);

	if (!needsTip) {
		return (
			<span className={cn("block max-w-[14rem] truncate md:max-w-[20rem]", className)}>
				{text}
			</span>
		);
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					className={cn(
						"block max-w-[14rem] cursor-default truncate border-b border-dotted border-neutral-400 text-left md:max-w-[20rem]",
						className,
					)}
				>
					{display}
				</button>
			</TooltipTrigger>
			<TooltipContent
				side="top"
				className="max-w-md whitespace-pre-wrap break-words"
			>
				{text}
			</TooltipContent>
		</Tooltip>
	);
}
