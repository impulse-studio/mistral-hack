import type { VariantProps } from "class-variance-authority";

import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const pixelDividerVariants = cva("border-border", {
	variants: {
		orientation: {
			horizontal: "w-full border-t-2",
			vertical: "h-full border-l-2",
		},
		variant: {
			solid: "border-solid",
			dashed: "border-dashed",
			dotted: "border-dotted",
		},
	},
	defaultVariants: {
		orientation: "horizontal",
		variant: "solid",
	},
});

export interface PixelDividerProps {
	/** Direction of the divider line */
	orientation?: NonNullable<VariantProps<typeof pixelDividerVariants>["orientation"]>;
	/** Border style */
	variant?: NonNullable<VariantProps<typeof pixelDividerVariants>["variant"]>;
	/** Centered text label interrupting the line (e.g. "or", "Section") */
	label?: string;
	className?: string;
}

function PixelDivider({
	orientation = "horizontal",
	variant = "solid",
	label,
	className,
}: PixelDividerProps) {
	if (label && orientation === "horizontal") {
		return (
			<div
				data-slot="pixel-divider"
				role="separator"
				aria-orientation="horizontal"
				className={cn("flex w-full items-center", className)}
			>
				<hr
					className={cn(pixelDividerVariants({ orientation: "horizontal", variant }), "flex-1")}
				/>
				<span className="px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
					{label}
				</span>
				<hr
					className={cn(pixelDividerVariants({ orientation: "horizontal", variant }), "flex-1")}
				/>
			</div>
		);
	}

	return (
		<hr
			data-slot="pixel-divider"
			role="separator"
			aria-orientation={orientation}
			className={cn(pixelDividerVariants({ orientation, variant }), className)}
		/>
	);
}

export { PixelDivider, pixelDividerVariants };
