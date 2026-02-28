import type { VariantProps } from "class-variance-authority";

import { cva } from "class-variance-authority";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

const pixelAvatarVariants = cva(
	"relative inline-flex shrink-0 items-center justify-center border border-border font-mono font-semibold text-white",
	{
		variants: {
			size: {
				xs: "size-4 text-[7px]",
				sm: "size-5 text-[9px]",
				md: "size-6 text-[10px]",
				lg: "size-8 text-[11px]",
			},
		},
		defaultVariants: {
			size: "sm",
		},
	},
);

const statusDotVariants = cva("absolute -right-px -top-px size-2", {
	variants: {
		status: {
			idle: "bg-muted-foreground",
			active: "bg-green-500",
			error: "bg-red-500",
		},
	},
});

export interface PixelAvatarProps extends VariantProps<typeof pixelAvatarVariants> {
	/** 1-2 character initials, e.g. "SK" */
	initials?: string;
	/** Optional sprite/image URL */
	src?: string;
	/** CSS gradient or solid color for background */
	color?: string;
	/** Optional status dot indicator */
	status?: "idle" | "active" | "error";
	className?: string;
}

const DEFAULT_BACKGROUND = "linear-gradient(135deg, var(--primary), var(--ring))";

const pixelatedStyle: React.CSSProperties = { imageRendering: "pixelated" };

function PixelAvatar({ initials, src, color, size = "sm", status, className }: PixelAvatarProps) {
	const background = color ?? DEFAULT_BACKGROUND;
	const avatarStyle = useMemo(() => (src ? undefined : { background }), [src, background]);

	return (
		<div
			data-slot="pixel-avatar"
			className={cn(pixelAvatarVariants({ size }), className)}
			style={avatarStyle}
		>
			{src ? (
				<img
					src={src}
					alt={initials ?? ""}
					className="size-full object-cover"
					style={pixelatedStyle}
				/>
			) : (
				initials
			)}
			{status && <div className={statusDotVariants({ status })} />}
		</div>
	);
}

export { PixelAvatar, pixelAvatarVariants };
