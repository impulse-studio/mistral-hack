import type { VariantProps } from "class-variance-authority";

import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const pixelGlowDotVariants = cva("shrink-0", {
	variants: {
		color: {
			green: "bg-green-500 shadow-[0_0_0_2px_rgba(34,197,94,0.2)]",
			orange: "bg-orange-500 shadow-[0_0_0_2px_rgba(249,115,22,0.2)]",
			red: "bg-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.2)]",
			cyan: "bg-cyan-500 shadow-[0_0_0_2px_rgba(6,182,212,0.2)]",
			yellow: "bg-yellow-500 shadow-[0_0_0_2px_rgba(234,179,8,0.2)]",
			muted: "bg-muted-foreground shadow-none",
		},
		size: {
			sm: "size-1.5",
			md: "size-2",
			lg: "size-3",
		},
	},
	defaultVariants: {
		color: "green",
		size: "md",
	},
});

export interface PixelGlowProps {
	/** Status color of the glow dot */
	color?: NonNullable<VariantProps<typeof pixelGlowDotVariants>["color"]>;
	/** Dot size: 6px (sm), 8px (md), 12px (lg) */
	size?: NonNullable<VariantProps<typeof pixelGlowDotVariants>["size"]>;
	/** Animate opacity pulse with stepped timing */
	pulse?: boolean;
	/** Optional text label next to dot */
	label?: string;
	className?: string;
}

function PixelGlow({
	color = "green",
	size = "md",
	pulse = false,
	label,
	className,
}: PixelGlowProps) {
	return (
		<div data-slot="pixel-glow" className={cn("inline-flex items-center gap-1.5", className)}>
			<div className={cn(pixelGlowDotVariants({ color, size }), pulse && "animate-pixel-pulse")} />
			{label && (
				<span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
					{label}
				</span>
			)}
		</div>
	);
}

export { PixelGlow, pixelGlowDotVariants };
