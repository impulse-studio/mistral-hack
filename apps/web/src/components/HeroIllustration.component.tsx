import { useEffect, useRef } from "react";

import { CHARACTER_PALETTES, CHARACTER_TEMPLATES } from "@/lib/pixelAgents/spriteData";

const PALETTE_MAP: Record<string, keyof (typeof CHARACTER_PALETTES)[0]> = {
	hair: "hair",
	skin: "skin",
	shirt: "shirt",
	pants: "pants",
	shoes: "shoes",
};

/** Renders a character sprite template on a canvas at a given pixel scale */
function CharacterSprite({
	paletteIndex,
	direction,
	frameIndex,
	scale,
}: {
	paletteIndex: number;
	direction: "down" | "up" | "right";
	frameIndex: number;
	scale: number;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const palette = CHARACTER_PALETTES[paletteIndex];
	const template = CHARACTER_TEMPLATES[direction][frameIndex];

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, 16, 24);

		for (let y = 0; y < template.length; y++) {
			for (let x = 0; x < template[y].length; x++) {
				const cell = template[y][x];
				if (!cell) continue;

				const key = PALETTE_MAP[cell];
				const color = key ? palette[key] : cell;

				ctx.fillStyle = color;
				ctx.fillRect(x, y, 1, 1);
			}
		}
	}, [palette, template]);

	return (
		<canvas
			ref={canvasRef}
			width={16}
			height={24}
			style={{
				width: 16 * scale,
				height: 24 * scale,
				imageRendering: "pixelated",
			}}
		/>
	);
}

/** A sticker-style wrapper: white border, slight rotation, drop shadow */
function Sticker({
	children,
	rotate = 0,
	className,
}: {
	children: React.ReactNode;
	rotate?: number;
	className?: string;
}) {
	return (
		<div
			className={`inline-block border-[3px] border-white/90 bg-white/10 shadow-pixel-lg ${className ?? ""}`}
			style={{ transform: `rotate(${rotate}deg)` }}
		>
			{children}
		</div>
	);
}

export function HeroIllustration() {
	const s = 5;

	return (
		<div className="relative h-[420px] w-[400px]">
			{/* Character 1 — standing front (blue shirt) */}
			<Sticker rotate={-3} className="absolute top-[20px] left-[30px]">
				<CharacterSprite paletteIndex={0} direction="down" frameIndex={1} scale={s} />
			</Sticker>

			{/* Character 2 — typing (red shirt) */}
			<Sticker rotate={4} className="absolute top-[0px] right-[40px]">
				<CharacterSprite paletteIndex={1} direction="down" frameIndex={3} scale={s} />
			</Sticker>

			{/* Character 3 — walking right (green shirt) */}
			<Sticker rotate={-5} className="absolute top-[160px] left-[0px]">
				<CharacterSprite paletteIndex={2} direction="right" frameIndex={1} scale={s} />
			</Sticker>

			{/* Character 4 — standing front (purple shirt) */}
			<Sticker rotate={3} className="absolute top-[150px] right-[20px]">
				<CharacterSprite paletteIndex={3} direction="down" frameIndex={1} scale={s} />
			</Sticker>

			{/* Character 5 — reading (yellow/gold shirt) */}
			<Sticker rotate={-2} className="absolute bottom-[80px] left-[100px]">
				<CharacterSprite paletteIndex={4} direction="down" frameIndex={5} scale={s} />
			</Sticker>

			{/* Character 6 — walking right (orange shirt) */}
			<Sticker rotate={5} className="absolute bottom-[20px] right-[60px]">
				<CharacterSprite paletteIndex={5} direction="right" frameIndex={0} scale={s} />
			</Sticker>
		</div>
	);
}
