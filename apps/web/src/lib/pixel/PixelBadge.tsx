import type { ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";

import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const pixelBadgeVariants = cva(
	"inline-flex items-center font-mono font-semibold uppercase tracking-widest",
	{
		variants: {
			color: {
				blue: "",
				purple: "",
				red: "",
				green: "",
				yellow: "",
				orange: "",
				pink: "",
				cyan: "",
				muted: "",
			},
			variant: {
				outline: "",
				solid: "",
			},
			size: {
				sm: "px-1 py-px text-[9px]",
				md: "px-1.5 py-px text-[10px]",
			},
		},
		compoundVariants: [
			// ── Outline variants ──
			{
				variant: "outline",
				color: "blue",
				className: "border-blue-500 bg-blue-500/10 text-blue-500",
			},
			{
				variant: "outline",
				color: "purple",
				className: "border-purple-500 bg-purple-500/10 text-purple-500",
			},
			{ variant: "outline", color: "red", className: "border-red-500 bg-red-500/10 text-red-500" },
			{
				variant: "outline",
				color: "green",
				className: "border-green-500 bg-green-500/10 text-green-500",
			},
			{
				variant: "outline",
				color: "yellow",
				className: "border-yellow-500 bg-yellow-500/10 text-yellow-500",
			},
			{
				variant: "outline",
				color: "orange",
				className: "border-orange-500 bg-orange-500/10 text-orange-500",
			},
			{
				variant: "outline",
				color: "pink",
				className: "border-pink-500 bg-pink-500/10 text-pink-500",
			},
			{
				variant: "outline",
				color: "cyan",
				className: "border-cyan-500 bg-cyan-500/10 text-cyan-500",
			},
			{
				variant: "outline",
				color: "muted",
				className: "border-border bg-muted text-muted-foreground",
			},

			// ── Solid variants ──
			{ variant: "solid", color: "blue", className: "border-blue-700 bg-blue-500 text-white" },
			{
				variant: "solid",
				color: "purple",
				className: "border-purple-700 bg-purple-500 text-white",
			},
			{ variant: "solid", color: "red", className: "border-red-700 bg-red-500 text-white" },
			{ variant: "solid", color: "green", className: "border-green-700 bg-green-500 text-white" },
			{
				variant: "solid",
				color: "yellow",
				className: "border-yellow-700 bg-yellow-500 text-white",
			},
			{
				variant: "solid",
				color: "orange",
				className: "border-orange-700 bg-orange-500 text-white",
			},
			{ variant: "solid", color: "pink", className: "border-pink-700 bg-pink-500 text-white" },
			{ variant: "solid", color: "cyan", className: "border-cyan-700 bg-cyan-500 text-white" },
			{
				variant: "solid",
				color: "muted",
				className: "border-border bg-muted-foreground text-background",
			},
		],
		defaultVariants: {
			color: "muted",
			variant: "outline",
			size: "md",
		},
	},
);

interface PixelBadgeProps {
	children: ReactNode;
	color?: NonNullable<VariantProps<typeof pixelBadgeVariants>["color"]>;
	variant?: NonNullable<VariantProps<typeof pixelBadgeVariants>["variant"]>;
	size?: NonNullable<VariantProps<typeof pixelBadgeVariants>["size"]>;
	className?: string;
}

function PixelBadge({
	children,
	color = "muted",
	variant = "outline",
	size = "md",
	className,
}: PixelBadgeProps) {
	return (
		<span
			data-slot="pixel-badge"
			className={cn("border", pixelBadgeVariants({ color, variant, size }), className)}
		>
			{children}
		</span>
	);
}

export { PixelBadge, pixelBadgeVariants };
export type { PixelBadgeProps };
