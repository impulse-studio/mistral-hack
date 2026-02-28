const pixelatedStyle = { imageRendering: "pixelated" as const };

/**
 * Tiny avatar: shows profile image if available, otherwise renders
 * a pixel-art character head via an inline SVG.
 */
export function PixelAvatar({ src, size = 28 }: { src?: string | null; size?: number }) {
	if (src) {
		return (
			<img
				src={src}
				alt="avatar"
				width={size}
				height={size}
				className="border-2 border-border"
				style={pixelatedStyle}
			/>
		);
	}

	// 7×7 pixel-art head (1 = skin, 2 = hair, 3 = eye, 0 = transparent)
	const grid = [
		[0, 2, 2, 2, 2, 2, 0],
		[2, 2, 2, 2, 2, 2, 2],
		[2, 1, 1, 1, 1, 1, 2],
		[1, 1, 3, 1, 3, 1, 1],
		[1, 1, 1, 1, 1, 1, 1],
		[0, 1, 1, 1, 1, 1, 0],
		[0, 0, 1, 1, 1, 0, 0],
	];

	const palette: Record<number, string> = {
		1: "#f5c8a0", // skin
		2: "#5b3a29", // hair
		3: "#1a1a2e", // eyes
	};

	const px = size / 7;

	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			className="border-2 border-border"
			style={pixelatedStyle}
		>
			{grid.map((row, y) =>
				row.map((cell, x) =>
					cell ? (
						<rect
							key={`${x}-${y}`}
							x={x * px}
							y={y * px}
							width={px}
							height={px}
							fill={palette[cell]}
						/>
					) : null,
				),
			)}
		</svg>
	);
}
