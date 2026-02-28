import { useMemo, type ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";

import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const pixelIconVariants = cva("inline-flex shrink-0 items-center justify-center", {
	variants: {
		size: {
			sm: "size-4",
			md: "size-6",
			lg: "size-8",
			xl: "size-12",
		},
	},
	defaultVariants: {
		size: "md",
	},
});

/** Pixel sizes for each size token, used for sprite background-size calculations. */
const TILE_PX: Record<NonNullable<VariantProps<typeof pixelIconVariants>["size"]>, number> = {
	sm: 16,
	md: 24,
	lg: 32,
	xl: 48,
};

export interface PixelIconProps {
	/** Inline SVG or custom icon element (children mode). */
	children?: ReactNode;
	/** Sprite sheet URL (sprite mode). */
	src?: string;
	/** X offset in sprite sheet, in tiles. */
	spriteX?: number;
	/** Y offset in sprite sheet, in tiles. */
	spriteY?: number;
	/** Icon size: sm=16px, md=24px, lg=32px, xl=48px. */
	size?: NonNullable<VariantProps<typeof pixelIconVariants>["size"]>;
	/** Color passthrough for SVG icons via currentColor. */
	color?: string;
	/** Accessible label. When provided, sets role="img" + aria-label. When absent, sets aria-hidden="true". */
	label?: string;
	className?: string;
}

function PixelIcon({
	children,
	src,
	spriteX = 0,
	spriteY = 0,
	size = "md",
	color,
	label,
	className,
}: PixelIconProps) {
	const accessibilityProps = label
		? ({ role: "img", "aria-label": label } as const)
		: ({ "aria-hidden": true } as const);

	const tilePx = TILE_PX[size];

	const spriteStyle = useMemo(
		() => ({
			imageRendering: "pixelated" as const,
			backgroundImage: `url(${src})`,
			backgroundPosition: `-${spriteX * tilePx}px -${spriteY * tilePx}px`,
			backgroundSize: "auto",
			backgroundRepeat: "no-repeat",
		}),
		[src, spriteX, spriteY, tilePx],
	);

	const svgStyle = useMemo(
		() => ({
			imageRendering: "pixelated" as const,
			...(color ? { color } : undefined),
		}),
		[color],
	);

	// Sprite sheet mode
	if (src) {
		return (
			<div
				data-slot="pixel-icon"
				className={cn(pixelIconVariants({ size }), className)}
				style={spriteStyle}
				{...accessibilityProps}
			/>
		);
	}

	// SVG children mode
	return (
		<span
			data-slot="pixel-icon"
			className={cn(pixelIconVariants({ size }), "[&>svg]:size-full", className)}
			style={svgStyle}
			{...accessibilityProps}
		>
			{children}
		</span>
	);
}

export { PixelIcon, pixelIconVariants };
