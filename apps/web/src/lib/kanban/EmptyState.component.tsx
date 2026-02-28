import type { ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";

import { cva } from "class-variance-authority";

import { PixelText } from "@/lib/pixel";
import { cn } from "@/lib/utils";

const kanbanEmptyStateVariants = cva("flex flex-col items-center justify-center text-center", {
	variants: {
		variant: {
			board:
				"relative min-h-80 overflow-hidden border-2 border-border bg-card p-10 shadow-pixel-lg inset-shadow-pixel",
			column: "min-h-48 gap-3 border-2 border-dashed border-border bg-muted/30 p-6",
		},
	},
	defaultVariants: {
		variant: "board",
	},
});

export interface KanbanEmptyStateProps extends VariantProps<typeof kanbanEmptyStateVariants> {
	icon?: ReactNode;
	title: string;
	description?: string;
	actionLabel?: string;
	onAction?: () => void;
	secondaryLabel?: string;
	onSecondaryAction?: () => void;
	className?: string;
}

function KanbanEmptyState({
	variant = "board",
	icon,
	title,
	description,
	actionLabel,
	onAction,
	secondaryLabel,
	onSecondaryAction,
	className,
}: KanbanEmptyStateProps) {
	return (
		<div data-slot="empty-state" className={cn(kanbanEmptyStateVariants({ variant }), className)}>
			{/* Background decoration for board variant */}
			{variant === "board" && (
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					{/* Grid pattern */}
					<div
						className="absolute inset-0 opacity-20"
						style={{
							backgroundImage:
								"linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
							backgroundSize: "60px 60px",
							maskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
							WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
						}}
					/>
					{/* Orange glow — hard-edged, no blur */}
					<div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 bg-brand-accent/8" />
				</div>
			)}

			{/* Content */}
			<div
				className={cn(
					"relative z-10 flex flex-col items-center",
					variant === "board" ? "gap-4" : "gap-2",
				)}
			>
				{/* Icon / illustration slot */}
				{icon && (
					<div
						className={cn(
							"flex items-center justify-center text-muted-foreground",
							variant === "board" ? "mb-2 size-20" : "size-10",
						)}
					>
						{icon}
					</div>
				)}

				{/* Title */}
				<PixelText as="h3" variant={variant === "board" ? "heading" : "label"}>
					{title}
				</PixelText>

				{/* Description */}
				{description && (
					<PixelText
						as="p"
						variant="body"
						color="muted"
						className={cn("max-w-xs leading-relaxed", variant === "column" && "text-[10px]")}
					>
						{description}
					</PixelText>
				)}

				{/* Primary action */}
				{actionLabel && (
					<button
						type="button"
						className={cn(
							"mt-1 inline-flex items-center gap-2 font-mono font-semibold uppercase tracking-widest",
							variant === "board"
								? "border-2 border-orange-700 bg-brand-accent px-5 py-2.5 text-xs text-white shadow-pixel-hover inset-shadow-bevel hover:inset-shadow-bevel-hover hover:shadow-pixel-lg hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px active:shadow-none active:inset-shadow-pressed"
								: "border-2 border-dashed border-border px-3 py-1.5 text-[10px] text-muted-foreground hover:border-brand-accent hover:text-brand-accent",
						)}
						onClick={onAction}
					>
						{actionLabel}
					</button>
				)}

				{/* Secondary action (board only) */}
				{variant === "board" && secondaryLabel && (
					<button
						type="button"
						className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 transition-colors hover:text-muted-foreground"
						onClick={onSecondaryAction}
					>
						{secondaryLabel}
					</button>
				)}
			</div>
		</div>
	);
}

export { KanbanEmptyState, kanbanEmptyStateVariants };
