import type { VariantProps } from "class-variance-authority";

import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const pixelProgressVariants = cva("flex overflow-hidden border-2 border-border bg-muted", {
	variants: {
		size: {
			sm: "h-1.5 gap-[1px]",
			md: "h-2.5 gap-[2px]",
		},
	},
	defaultVariants: {
		size: "md",
	},
});

const pixelSegmentVariants = cva("flex-1", {
	variants: {
		color: {
			green: "bg-green-500",
			orange: "bg-orange-500",
			red: "bg-red-500",
			cyan: "bg-cyan-500",
			muted: "bg-muted-foreground/60",
		},
		filled: {
			true: "",
			false: "bg-transparent",
		},
		complete: {
			true: "bg-green-500",
			false: "",
		},
	},
	defaultVariants: {
		color: "green",
		filled: false,
		complete: false,
	},
});

export interface PixelProgressProps {
	/** 0-100 when used as percentage, or current count when `max` is provided */
	value: number;
	/** If provided, value is treated as a count: filled = value/max */
	max?: number;
	/** Number of discrete blocks (default: 8) */
	segments?: number;
	/** Fill color for active segments */
	color?: NonNullable<VariantProps<typeof pixelSegmentVariants>["color"]>;
	/** Show label text ("3/5" or "60%") next to the bar */
	showLabel?: boolean;
	/** Height variant */
	size?: NonNullable<VariantProps<typeof pixelProgressVariants>["size"]>;
	className?: string;
}

function PixelProgress({
	value,
	max,
	segments = 8,
	color = "green",
	showLabel = false,
	size = "md",
	className,
}: PixelProgressProps) {
	const percent = max !== undefined && max > 0 ? Math.round((value / max) * 100) : value;
	const clampedPercent = Math.max(0, Math.min(100, percent));
	const filledCount = Math.round((clampedPercent / 100) * segments);
	const isComplete = clampedPercent >= 100;

	const label = max !== undefined ? `${value}/${max}` : `${clampedPercent}%`;

	return (
		<div data-slot="pixel-progress" className={cn("flex items-center gap-1.5", className)}>
			<div
				className={cn(pixelProgressVariants({ size }))}
				role="progressbar"
				aria-valuenow={clampedPercent}
				aria-valuemin={0}
				aria-valuemax={100}
			>
				{Array.from({ length: segments }, (_, i) => (
					<div
						key={i}
						className={cn(
							pixelSegmentVariants({
								color,
								filled: i < filledCount,
								complete: isComplete && i < filledCount,
							}),
						)}
					/>
				))}
			</div>
			{showLabel && <span className="font-mono text-[11px] text-muted-foreground">{label}</span>}
		</div>
	);
}

export { PixelProgress, pixelProgressVariants, pixelSegmentVariants };
