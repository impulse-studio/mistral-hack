import type { ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";

import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const pixelBorderBoxVariants = cva("", {
	variants: {
		variant: {
			solid: "border-2 border-border bg-card",
			dashed: "border-2 border-dashed border-border bg-muted/30",
			none: "bg-card",
		},
		elevation: {
			flat: "",
			raised: "shadow-pixel inset-shadow-pixel",
			floating: "shadow-pixel-lg inset-shadow-pixel",
		},
		interactive: {
			true: [
				"cursor-pointer",
				"hover:border-muted-foreground/40 hover:shadow-pixel-hover hover:inset-shadow-pixel-hover hover:-translate-x-px hover:-translate-y-px",
				"active:translate-x-px active:translate-y-px active:shadow-none active:inset-shadow-pressed",
			],
			false: "",
		},
	},
	compoundVariants: [
		// Dashed variant ignores elevation — no shadows
		{ variant: "dashed", elevation: "raised", className: "shadow-none inset-shadow-none" },
		{ variant: "dashed", elevation: "floating", className: "shadow-none inset-shadow-none" },
		// None variant ignores elevation — no border, no shadows
		{ variant: "none", elevation: "raised", className: "shadow-none inset-shadow-none" },
		{ variant: "none", elevation: "floating", className: "shadow-none inset-shadow-none" },
	],
	defaultVariants: {
		variant: "solid",
		elevation: "raised",
		interactive: false,
	},
});

type PixelBorderBoxElement = "div" | "section" | "aside" | "article";

interface PixelBorderBoxProps extends VariantProps<typeof pixelBorderBoxVariants> {
	children?: ReactNode;
	as?: PixelBorderBoxElement;
	className?: string;
}

function PixelBorderBox({
	children,
	as: Tag = "div",
	variant = "solid",
	elevation = "raised",
	interactive = false,
	className,
}: PixelBorderBoxProps) {
	return (
		<Tag
			data-slot="pixel-border-box"
			className={cn(pixelBorderBoxVariants({ variant, elevation, interactive }), className)}
		>
			{children}
		</Tag>
	);
}

export { PixelBorderBox, pixelBorderBoxVariants };
export type { PixelBorderBoxProps };
