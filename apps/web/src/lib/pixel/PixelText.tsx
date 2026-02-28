import type { ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";

import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const pixelTextVariants = cva("", {
	variants: {
		variant: {
			label: "font-mono text-[10px] uppercase tracking-widest font-semibold",
			id: "font-mono text-[11px] font-medium text-muted-foreground",
			body: "text-xs font-medium leading-relaxed",
			heading: "font-mono font-semibold uppercase tracking-widest text-sm",
			code: "font-mono text-[11px] leading-snug",
		},
		color: {
			default: "text-foreground",
			muted: "text-muted-foreground",
			accent: "text-accent-foreground",
			success: "text-green-500",
			error: "text-red-500",
			warning: "text-yellow-500",
		},
	},
	defaultVariants: {
		variant: "body",
		color: "default",
	},
});

type PixelTextElement = "span" | "p" | "h1" | "h2" | "h3" | "h4" | "label" | "code" | "pre";

export interface PixelTextProps extends VariantProps<typeof pixelTextVariants> {
	children: ReactNode;
	as?: PixelTextElement;
	className?: string;
}

/** Shared inline style that disables font anti-aliasing for pixel crispness. */
const pixelStyle: React.CSSProperties = {
	WebkitFontSmoothing: "none",
	MozOsxFontSmoothing: "auto",
	imageRendering: "pixelated",
} as React.CSSProperties;

function PixelText({
	children,
	as: Tag = "span",
	variant = "body",
	color = "default",
	className,
}: PixelTextProps) {
	return (
		<Tag
			data-slot="pixel-text"
			className={cn(pixelTextVariants({ variant, color }), className)}
			style={pixelStyle}
		>
			{children}
		</Tag>
	);
}

export { PixelText, pixelTextVariants };
