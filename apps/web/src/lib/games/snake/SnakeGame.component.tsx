import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════
   Snake Game — Pixel Art Edition
   Food: Mistral M icon (boxed)
   ═══════════════════════════════════════════════════════ */

// ── Grid ─────────────────────────────────────────────
const COLS = 20;
const ROWS = 15;
const CELL = 20;
const CANVAS_W = COLS * CELL;
const CANVAS_H = ROWS * CELL;

// ── Timing ───────────────────────────────────────────
const BASE_TICK_MS = 140;
const MIN_TICK_MS = 60;
const SPEED_PER_POINT = 3;

// ── Direction: up=0 right=1 down=2 left=3 ────────────
const DX = [0, 1, 0, -1] as const;
const DY = [-1, 0, 1, 0] as const;
type Dir = 0 | 1 | 2 | 3;

const CANVAS_STYLE = {
	width: CANVAS_W,
	height: CANVAS_H,
	imageRendering: "pixelated" as const,
	display: "block" as const,
};

// ── Mistral "M" icon — 5×5 bitmap ───────────────────
// ■ · · · ■
// ■ ■ · ■ ■
// ■ · ■ · ■
// ■ · · · ■
// ■ · · · ■
const M_ROWS = [0b1_0001, 0b1_1011, 0b1_0101, 0b1_0001, 0b1_0001];

// ── Palette ──────────────────────────────────────────
const P = {
	bg: "#0d0d1a",
	grid: "#14142a",
	// snake
	head: "#22eedd",
	body: "#0fb8a8",
	bodyDark: "#0a8a7e",
	tail: "#077a6e",
	snakeOutline: "#054a42",
	eye: "#0d0d1a",
	// food (Mistral M)
	foodBorder: "#ff7000",
	foodBg: "#1c0a00",
	mOrange: "#ff7000",
	mYellow: "#ffaa00",
	// overlays
	textDim: "#666680",
	accent: "#ff7000",
	dead: "#ff3333",
};

// ── Types ────────────────────────────────────────────
interface Pt {
	x: number;
	y: number;
}
type Status = "idle" | "playing" | "dead";

function eq(a: Pt, b: Pt) {
	return a.x === b.x && a.y === b.y;
}

function spawnFood(snake: Pt[]): Pt {
	let p: Pt;
	do {
		p = {
			x: Math.floor(Math.random() * COLS),
			y: Math.floor(Math.random() * ROWS),
		};
	} while (snake.some((s) => eq(s, p)));
	return p;
}

// ── Component ────────────────────────────────────────
interface SnakeGameProps {
	className?: string;
}

function SnakeGame({ className }: SnakeGameProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const rafRef = useRef(0);
	const lastTickRef = useRef(0);

	// Mutable game state (ref to avoid re-renders every tick)
	const g = useRef({
		snake: [] as Pt[],
		dir: 1 as Dir,
		nextDir: 1 as Dir,
		food: { x: 15, y: 7 } as Pt,
		score: 0,
		best: 0,
		status: "idle" as Status,
	});

	// React state for the score bar UI
	const [score, setScore] = useState(0);
	const [best, setBest] = useState(0);
	const [status, setStatus] = useState<Status>("idle");

	// ── Reset ────────────────────────────────────────
	const reset = useCallback(() => {
		const s = g.current;
		s.snake = [
			{ x: 10, y: 7 },
			{ x: 9, y: 7 },
			{ x: 8, y: 7 },
		];
		s.dir = 1;
		s.nextDir = 1;
		s.food = spawnFood(s.snake);
		s.score = 0;
		s.status = "playing";
		setScore(0);
		setStatus("playing");
		lastTickRef.current = performance.now();
	}, []);

	// ── Tick ─────────────────────────────────────────
	const tick = useCallback(() => {
		const s = g.current;
		if (s.status !== "playing") return;

		s.dir = s.nextDir;
		const head = s.snake[0];
		const nx = head.x + DX[s.dir];
		const ny = head.y + DY[s.dir];

		// Wall or self collision
		if (
			nx < 0 ||
			nx >= COLS ||
			ny < 0 ||
			ny >= ROWS ||
			s.snake.some((p) => p.x === nx && p.y === ny)
		) {
			s.status = "dead";
			if (s.score > s.best) {
				s.best = s.score;
				setBest(s.score);
			}
			setStatus("dead");
			return;
		}

		const next = { x: nx, y: ny };
		s.snake.unshift(next);

		if (eq(next, s.food)) {
			s.score++;
			setScore(s.score);
			s.food = spawnFood(s.snake);
		} else {
			s.snake.pop();
		}
	}, []);

	// ── Draw: grid ───────────────────────────────────
	const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
		ctx.fillStyle = P.bg;
		ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

		ctx.strokeStyle = P.grid;
		ctx.lineWidth = 1;
		for (let x = 0; x <= COLS; x++) {
			ctx.beginPath();
			ctx.moveTo(x * CELL + 0.5, 0);
			ctx.lineTo(x * CELL + 0.5, CANVAS_H);
			ctx.stroke();
		}
		for (let y = 0; y <= ROWS; y++) {
			ctx.beginPath();
			ctx.moveTo(0, y * CELL + 0.5);
			ctx.lineTo(CANVAS_W, y * CELL + 0.5);
			ctx.stroke();
		}
	}, []);

	// ── Draw: snake ──────────────────────────────────
	const drawSnake = useCallback((ctx: CanvasRenderingContext2D) => {
		const s = g.current;
		const len = s.snake.length;

		for (let i = len - 1; i >= 0; i--) {
			const pt = s.snake[i];
			const px = pt.x * CELL;
			const py = pt.y * CELL;
			const t = len > 1 ? i / (len - 1) : 0;

			let fill: string;
			if (i === 0) fill = P.head;
			else if (t < 0.4) fill = P.body;
			else if (t < 0.7) fill = P.bodyDark;
			else fill = P.tail;

			// Outline
			ctx.fillStyle = P.snakeOutline;
			ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);

			// Inner
			ctx.fillStyle = fill;
			ctx.fillRect(px + 3, py + 3, CELL - 6, CELL - 6);

			// Eyes on head
			if (i === 0) {
				ctx.fillStyle = P.eye;
				const d = s.dir;
				if (d === 0 || d === 2) {
					const ey = d === 0 ? 5 : CELL - 7;
					ctx.fillRect(px + 5, py + ey, 2, 2);
					ctx.fillRect(px + CELL - 7, py + ey, 2, 2);
				} else {
					const ex = d === 1 ? CELL - 7 : 5;
					ctx.fillRect(px + ex, py + 5, 2, 2);
					ctx.fillRect(px + ex, py + CELL - 7, 2, 2);
				}
			}
		}
	}, []);

	// ── Draw: Mistral M food (boxed) ─────────────────
	const drawFood = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
		const food = g.current.food;
		const px = food.x * CELL;
		const py = food.y * CELL;

		// Pulsing glow
		const pulse = 0.5 + 0.5 * Math.sin(time * 0.005);
		ctx.globalAlpha = pulse * 0.25;
		ctx.fillStyle = P.foodBorder;
		ctx.fillRect(px - 3, py - 3, CELL + 6, CELL + 6);
		ctx.globalAlpha = 1;

		// Dark background
		ctx.fillStyle = P.foodBg;
		ctx.fillRect(px, py, CELL, CELL);

		// 2px border — the "box"
		ctx.strokeStyle = P.foodBorder;
		ctx.lineWidth = 2;
		ctx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);

		// M pattern inside (5×5 grid within the box)
		const pad = 4;
		const inner = CELL - pad * 2;
		const pxSz = inner / 5;

		for (let r = 0; r < 5; r++) {
			for (let c = 0; c < 5; c++) {
				if (M_ROWS[r] & (1 << (4 - c))) {
					ctx.fillStyle = (r + c) % 2 === 0 ? P.mOrange : P.mYellow;
					ctx.fillRect(
						Math.round(px + pad + c * pxSz),
						Math.round(py + pad + r * pxSz),
						Math.ceil(pxSz),
						Math.ceil(pxSz),
					);
				}
			}
		}
	}, []);

	// ── Draw: overlay (idle / game over) ─────────────
	const drawOverlay = useCallback(
		(ctx: CanvasRenderingContext2D, title: string, sub: string, color: string) => {
			ctx.fillStyle = "rgba(13, 13, 26, 0.88)";
			ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

			ctx.textAlign = "center";
			ctx.textBaseline = "middle";

			ctx.fillStyle = color;
			ctx.font = "bold 28px monospace";
			ctx.fillText(title, CANVAS_W / 2, CANVAS_H / 2 - 18);

			ctx.fillStyle = P.textDim;
			ctx.font = "12px monospace";
			ctx.fillText(sub, CANVAS_W / 2, CANVAS_H / 2 + 18);

			ctx.textAlign = "start";
			ctx.textBaseline = "alphabetic";
		},
		[],
	);

	// ── Game loop ────────────────────────────────────
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.imageSmoothingEnabled = false;

		function loop(time: number) {
			const s = g.current;
			const tickMs = Math.max(MIN_TICK_MS, BASE_TICK_MS - s.score * SPEED_PER_POINT);

			if (s.status === "playing" && time - lastTickRef.current >= tickMs) {
				tick();
				lastTickRef.current = time;
			}

			drawGrid(ctx!);
			drawSnake(ctx!);
			drawFood(ctx!, time);

			if (s.status === "idle") {
				drawOverlay(ctx!, "SNAKE", "Press SPACE to start", P.accent);
			} else if (s.status === "dead") {
				drawOverlay(ctx!, "GAME OVER", `Score: ${s.score}  —  SPACE to retry`, P.dead);
			}

			rafRef.current = requestAnimationFrame(loop);
		}

		rafRef.current = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(rafRef.current);
	}, [tick, drawGrid, drawSnake, drawFood, drawOverlay]);

	// ── Keyboard ─────────────────────────────────────
	useEffect(() => {
		const el = wrapRef.current;
		if (!el) return;

		function onKey(e: KeyboardEvent) {
			const s = g.current;

			if (e.code === "Space") {
				e.preventDefault();
				if (s.status !== "playing") reset();
				return;
			}

			if (s.status !== "playing") return;

			const map: Record<string, Dir> = {
				ArrowUp: 0,
				w: 0,
				W: 0,
				ArrowRight: 1,
				d: 1,
				D: 1,
				ArrowDown: 2,
				s: 2,
				S: 2,
				ArrowLeft: 3,
				a: 3,
				A: 3,
			};

			const nd = map[e.key];
			if (nd !== undefined) {
				e.preventDefault();
				// Block 180° reversal
				if ((nd + 2) % 4 !== s.dir) s.nextDir = nd;
			}
		}

		el.addEventListener("keydown", onKey);
		el.focus();
		return () => el.removeEventListener("keydown", onKey);
	}, [reset]);

	return (
		<div
			ref={wrapRef}
			tabIndex={0}
			className={cn("inline-flex flex-col gap-2 outline-none focus:outline-none", className)}
		>
			{/* Score bar */}
			<div className="flex items-center justify-between border-2 border-border bg-card px-3 py-1.5 shadow-pixel inset-shadow-pixel">
				<span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
					Score
				</span>
				<span className="font-mono text-sm font-bold tabular-nums text-brand-accent">
					{String(score).padStart(4, "0")}
				</span>
				{best > 0 && (
					<span className="font-mono text-[10px] font-medium text-muted-foreground">
						Best: {best}
					</span>
				)}
			</div>

			{/* Canvas */}
			<div className="border-2 border-border shadow-pixel inset-shadow-pixel">
				<canvas
					ref={canvasRef}
					width={CANVAS_W}
					height={CANVAS_H}
					// eslint-disable-next-line react-perf/jsx-no-new-object-as-prop -- static canvas style
					style={CANVAS_STYLE}
				/>
			</div>

			{/* Controls hint */}
			<div className="flex items-center justify-center gap-4">
				<span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
					WASD / Arrows
				</span>
				<span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
					Space: {status === "playing" ? "—" : "Start"}
				</span>
			</div>
		</div>
	);
}

export { SnakeGame as GamesSnakeGame };
export type { SnakeGameProps as GamesSnakeGameProps };
