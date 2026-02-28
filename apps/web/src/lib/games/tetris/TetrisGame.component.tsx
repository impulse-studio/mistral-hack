import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════
   Tetris — Pixel Art Edition
   ═══════════════════════════════════════════════════════ */

// ── Field ────────────────────────────────────────────
const F_COLS = 10;
const F_ROWS = 20;
const CELL = 20;

// ── Canvas layout ────────────────────────────────────
const FIELD_W = F_COLS * CELL; // 200
const FIELD_H = F_ROWS * CELL; // 400
const SIDE_W = 6 * CELL; // 120
const GAP = CELL; // 20
const CANVAS_W = FIELD_W + GAP + SIDE_W; // 340
const CANVAS_H = FIELD_H; // 400
const CANVAS_STYLE = {
	width: CANVAS_W,
	height: CANVAS_H,
	imageRendering: "pixelated" as const,
	display: "block" as const,
};

// ── Timing ───────────────────────────────────────────
const BASE_TICK_MS = 800;
const MIN_TICK_MS = 80;
const SPEED_FACTOR = 60;

// ── Scoring ──────────────────────────────────────────
const LINES_PER_LEVEL = 10;

// ── Piece definitions ────────────────────────────────
type Cell = [number, number]; // [row, col]

interface PieceDef {
	cells: Cell[];
	size: number;
	color: string;
	outline: string;
}

const PIECES: PieceDef[] = [
	// I
	{
		cells: [
			[1, 0],
			[1, 1],
			[1, 2],
			[1, 3],
		],
		size: 4,
		color: "#00d4ff",
		outline: "#007a99",
	},
	// O
	{
		cells: [
			[0, 0],
			[0, 1],
			[1, 0],
			[1, 1],
		],
		size: 2,
		color: "#ffdd00",
		outline: "#997700",
	},
	// T
	{
		cells: [
			[0, 1],
			[1, 0],
			[1, 1],
			[1, 2],
		],
		size: 3,
		color: "#aa44ff",
		outline: "#6622aa",
	},
	// S
	{
		cells: [
			[0, 1],
			[0, 2],
			[1, 0],
			[1, 1],
		],
		size: 3,
		color: "#44dd44",
		outline: "#228822",
	},
	// Z
	{
		cells: [
			[0, 0],
			[0, 1],
			[1, 1],
			[1, 2],
		],
		size: 3,
		color: "#ff3344",
		outline: "#991122",
	},
	// J
	{
		cells: [
			[0, 0],
			[1, 0],
			[1, 1],
			[1, 2],
		],
		size: 3,
		color: "#3366ff",
		outline: "#1133aa",
	},
	// L (Mistral orange)
	{
		cells: [
			[0, 2],
			[1, 0],
			[1, 1],
			[1, 2],
		],
		size: 3,
		color: "#ff7000",
		outline: "#993800",
	},
];

// ── Rotation helper ──────────────────────────────────
function rotateCells(cells: Cell[], size: number, times: number): Cell[] {
	let result = cells.map(([r, c]) => [r, c] as Cell);
	const n = ((times % 4) + 4) % 4;
	for (let i = 0; i < n; i++) {
		result = result.map(([r, c]) => [c, size - 1 - r] as Cell);
	}
	return result;
}

// ── Palette ──────────────────────────────────────────
const P = {
	bg: "#0d0d1a",
	fieldBg: "#0a0a16",
	grid: "#14142a",
	ghost: "rgba(255, 255, 255, 0.08)",
	ghostBorder: "rgba(255, 255, 255, 0.15)",
	sideBg: "#0d0d1a",
	textBright: "#e8e8f0",
	textDim: "#666680",
	accent: "#ff7000",
	dead: "#ff3333",
};

// ── Types ────────────────────────────────────────────
type Status = "idle" | "playing" | "dead";

interface ActivePiece {
	type: number;
	rot: number;
	row: number;
	col: number;
}

interface GameState {
	board: number[][]; // 0 = empty, 1–7 = piece type + 1
	active: ActivePiece | null;
	next: number;
	score: number;
	best: number;
	level: number;
	lines: number;
	status: Status;
}

// ── Helpers ──────────────────────────────────────────
function emptyBoard(): number[][] {
	return Array.from({ length: F_ROWS }, () => Array<number>(F_COLS).fill(0));
}

function randomPiece(): number {
	return Math.floor(Math.random() * PIECES.length);
}

function getAbsCells(piece: ActivePiece): Cell[] {
	const def = PIECES[piece.type];
	return rotateCells(def.cells, def.size, piece.rot).map(
		([r, c]) => [r + piece.row, c + piece.col] as Cell,
	);
}

function fits(board: number[][], piece: ActivePiece): boolean {
	return getAbsCells(piece).every(
		([r, c]) => r >= 0 && r < F_ROWS && c >= 0 && c < F_COLS && board[r][c] === 0,
	);
}

function hardDropRow(board: number[][], piece: ActivePiece): number {
	let row = piece.row;
	while (fits(board, { ...piece, row: row + 1 })) row++;
	return row;
}

// ── Component ────────────────────────────────────────
interface TetrisGameProps {
	className?: string;
}

function TetrisGame({ className }: TetrisGameProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const rafRef = useRef(0);
	const lastTickRef = useRef(0);

	const g = useRef<GameState>({
		board: emptyBoard(),
		active: null,
		next: randomPiece(),
		score: 0,
		best: 0,
		level: 1,
		lines: 0,
		status: "idle",
	});

	// React state for the score bar UI
	const [score, setScore] = useState(0);
	const [best, setBest] = useState(0);
	const [status, setStatus] = useState<Status>("idle");

	// ── Spawn piece ──────────────────────────────────
	const spawn = useCallback(() => {
		const s = g.current;
		const type = s.next;
		s.next = randomPiece();
		const def = PIECES[type];
		const piece: ActivePiece = {
			type,
			rot: 0,
			row: 0,
			col: Math.floor((F_COLS - def.size) / 2),
		};
		if (!fits(s.board, piece)) {
			s.status = "dead";
			s.active = null;
			if (s.score > s.best) {
				s.best = s.score;
				setBest(s.score);
			}
			setStatus("dead");
			return;
		}
		s.active = piece;
	}, []);

	// ── Lock piece + clear lines ─────────────────────
	const lock = useCallback(() => {
		const s = g.current;
		if (!s.active) return;

		const cells = getAbsCells(s.active);
		for (const [r, c] of cells) {
			if (r >= 0 && r < F_ROWS && c >= 0 && c < F_COLS) {
				s.board[r][c] = s.active.type + 1;
			}
		}
		s.active = null;

		// Find and clear full rows
		const fullRows: number[] = [];
		for (let r = 0; r < F_ROWS; r++) {
			if (s.board[r].every((v) => v !== 0)) fullRows.push(r);
		}

		if (fullRows.length > 0) {
			for (const r of fullRows) {
				s.board.splice(r, 1);
				s.board.unshift(Array<number>(F_COLS).fill(0));
			}
			s.score += fullRows.length;
			s.lines += fullRows.length;
			s.level = Math.floor(s.lines / LINES_PER_LEVEL) + 1;
			setScore(s.score);
		}

		spawn();
	}, [spawn]);

	// ── Movement ─────────────────────────────────────
	const tryMove = useCallback((dr: number, dc: number): boolean => {
		const s = g.current;
		if (!s.active) return false;
		const moved = { ...s.active, row: s.active.row + dr, col: s.active.col + dc };
		if (fits(s.board, moved)) {
			s.active = moved;
			return true;
		}
		return false;
	}, []);

	const tryRotate = useCallback((dir: 1 | -1) => {
		const s = g.current;
		if (!s.active) return;
		const newRot = (((s.active.rot + dir) % 4) + 4) % 4;
		const rotated = { ...s.active, rot: newRot };
		// Basic wall kicks: try 0, ±1, ±2
		const kicks = [0, -1, 1, -2, 2];
		for (const kick of kicks) {
			const kicked = { ...rotated, col: rotated.col + kick };
			if (fits(s.board, kicked)) {
				s.active = kicked;
				return;
			}
		}
	}, []);

	const hardDrop = useCallback(() => {
		const s = g.current;
		if (!s.active) return;
		const dropTo = hardDropRow(s.board, s.active);
		s.active = { ...s.active, row: dropTo };
		lock();
	}, [lock]);

	// ── Reset ────────────────────────────────────────
	const reset = useCallback(() => {
		const s = g.current;
		s.board = emptyBoard();
		s.active = null;
		s.next = randomPiece();
		s.score = 0;
		s.level = 1;
		s.lines = 0;
		s.status = "playing";
		setScore(0);
		setStatus("playing");
		lastTickRef.current = performance.now();
		spawn();
	}, [spawn]);

	// ── Tick (gravity) ───────────────────────────────
	const tick = useCallback(() => {
		const s = g.current;
		if (s.status !== "playing" || !s.active) return;
		if (!tryMove(1, 0)) {
			lock();
		}
	}, [tryMove, lock]);

	// ── Draw: single block ───────────────────────────
	const drawBlock = useCallback(
		(ctx: CanvasRenderingContext2D, px: number, py: number, color: string, outline: string) => {
			ctx.fillStyle = outline;
			ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
			ctx.fillStyle = color;
			ctx.fillRect(px + 3, py + 3, CELL - 6, CELL - 6);
			// Top-left highlight
			ctx.fillStyle = "rgba(255,255,255,0.15)";
			ctx.fillRect(px + 3, py + 3, CELL - 6, 2);
			ctx.fillRect(px + 3, py + 3, 2, CELL - 6);
		},
		[],
	);

	// ── Draw: play field ─────────────────────────────
	const drawField = useCallback(
		(ctx: CanvasRenderingContext2D) => {
			const s = g.current;

			// Background
			ctx.fillStyle = P.fieldBg;
			ctx.fillRect(0, 0, FIELD_W, FIELD_H);

			// Grid
			ctx.strokeStyle = P.grid;
			ctx.lineWidth = 1;
			for (let x = 0; x <= F_COLS; x++) {
				ctx.beginPath();
				ctx.moveTo(x * CELL + 0.5, 0);
				ctx.lineTo(x * CELL + 0.5, FIELD_H);
				ctx.stroke();
			}
			for (let y = 0; y <= F_ROWS; y++) {
				ctx.beginPath();
				ctx.moveTo(0, y * CELL + 0.5);
				ctx.lineTo(FIELD_W, y * CELL + 0.5);
				ctx.stroke();
			}

			// Locked blocks
			for (let r = 0; r < F_ROWS; r++) {
				for (let c = 0; c < F_COLS; c++) {
					const v = s.board[r][c];
					if (v > 0) {
						const def = PIECES[v - 1];
						drawBlock(ctx, c * CELL, r * CELL, def.color, def.outline);
					}
				}
			}

			// Ghost piece
			if (s.active && s.status === "playing") {
				const ghostRow = hardDropRow(s.board, s.active);
				if (ghostRow !== s.active.row) {
					const ghostCells = getAbsCells({ ...s.active, row: ghostRow });
					for (const [r, c] of ghostCells) {
						if (r >= 0 && r < F_ROWS) {
							ctx.fillStyle = P.ghostBorder;
							ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
							ctx.fillStyle = P.ghost;
							ctx.fillRect(c * CELL + 3, r * CELL + 3, CELL - 6, CELL - 6);
						}
					}
				}
			}

			// Active piece
			if (s.active) {
				const def = PIECES[s.active.type];
				const cells = getAbsCells(s.active);
				for (const [r, c] of cells) {
					if (r >= 0 && r < F_ROWS) {
						drawBlock(ctx, c * CELL, r * CELL, def.color, def.outline);
					}
				}
			}
		},
		[drawBlock],
	);

	// ── Draw: side panel ─────────────────────────────
	const drawSidePanel = useCallback((ctx: CanvasRenderingContext2D) => {
		const ox = FIELD_W + GAP;
		const s = g.current;

		ctx.fillStyle = P.sideBg;
		ctx.fillRect(ox, 0, SIDE_W, CANVAS_H);

		// "NEXT" label
		ctx.fillStyle = P.textDim;
		ctx.font = "bold 10px monospace";
		ctx.textAlign = "center";
		ctx.fillText("NEXT", ox + SIDE_W / 2, 20);

		// Next piece preview
		const nextDef = PIECES[s.next];
		const nextCells = nextDef.cells;
		const previewCell = 14;
		const previewOx = ox + (SIDE_W - nextDef.size * previewCell) / 2;
		const previewOy = 30;

		// Preview box
		ctx.fillStyle = P.fieldBg;
		ctx.fillRect(ox + 8, previewOy - 4, SIDE_W - 16, nextDef.size * previewCell + 8);
		ctx.strokeStyle = P.grid;
		ctx.lineWidth = 2;
		ctx.strokeRect(ox + 8, previewOy - 4, SIDE_W - 16, nextDef.size * previewCell + 8);

		for (const [r, c] of nextCells) {
			const px = previewOx + c * previewCell;
			const py = previewOy + r * previewCell;
			ctx.fillStyle = nextDef.outline;
			ctx.fillRect(px + 1, py + 1, previewCell - 2, previewCell - 2);
			ctx.fillStyle = nextDef.color;
			ctx.fillRect(px + 2, py + 2, previewCell - 4, previewCell - 4);
		}

		// Stats
		const statsY = previewOy + 4 * previewCell + 30;
		ctx.textAlign = "center";

		// Level
		ctx.fillStyle = P.textDim;
		ctx.font = "bold 10px monospace";
		ctx.fillText("LEVEL", ox + SIDE_W / 2, statsY);
		ctx.fillStyle = P.accent;
		ctx.font = "bold 20px monospace";
		ctx.fillText(String(s.level), ox + SIDE_W / 2, statsY + 22);

		// Lines
		ctx.fillStyle = P.textDim;
		ctx.font = "bold 10px monospace";
		ctx.fillText("LINES", ox + SIDE_W / 2, statsY + 50);
		ctx.fillStyle = P.textBright;
		ctx.font = "bold 20px monospace";
		ctx.fillText(String(s.lines), ox + SIDE_W / 2, statsY + 72);

		ctx.textAlign = "start";
	}, []);

	// ── Draw: overlay ────────────────────────────────
	const drawOverlay = useCallback(
		(ctx: CanvasRenderingContext2D, title: string, sub: string, color: string) => {
			ctx.fillStyle = "rgba(13, 13, 26, 0.88)";
			ctx.fillRect(0, 0, FIELD_W, FIELD_H);

			ctx.textAlign = "center";
			ctx.textBaseline = "middle";

			ctx.fillStyle = color;
			ctx.font = "bold 24px monospace";
			ctx.fillText(title, FIELD_W / 2, FIELD_H / 2 - 18);

			ctx.fillStyle = P.textDim;
			ctx.font = "12px monospace";
			ctx.fillText(sub, FIELD_W / 2, FIELD_H / 2 + 18);

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
			const tickMs = Math.max(MIN_TICK_MS, BASE_TICK_MS - (s.level - 1) * SPEED_FACTOR);

			if (s.status === "playing" && time - lastTickRef.current >= tickMs) {
				tick();
				lastTickRef.current = time;
			}

			ctx!.fillStyle = P.bg;
			ctx!.fillRect(0, 0, CANVAS_W, CANVAS_H);

			drawField(ctx!);
			drawSidePanel(ctx!);

			if (s.status === "idle") {
				drawOverlay(ctx!, "TETRIS", "Press SPACE to start", P.accent);
			} else if (s.status === "dead") {
				drawOverlay(ctx!, "GAME OVER", `Score: ${s.score}  —  SPACE to retry`, P.dead);
			}

			rafRef.current = requestAnimationFrame(loop);
		}

		rafRef.current = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(rafRef.current);
	}, [tick, drawField, drawSidePanel, drawOverlay]);

	// ── Keyboard ─────────────────────────────────────
	useEffect(() => {
		const el = wrapRef.current;
		if (!el) return;

		function onKey(e: KeyboardEvent) {
			const s = g.current;

			if (e.code === "Space") {
				e.preventDefault();
				if (s.status !== "playing") {
					reset();
				} else {
					hardDrop();
				}
				return;
			}

			if (s.status !== "playing") return;

			switch (e.key) {
				case "ArrowLeft":
				case "a":
				case "A": {
					e.preventDefault();
					tryMove(0, -1);
					break;
				}
				case "ArrowRight":
				case "d":
				case "D": {
					e.preventDefault();
					tryMove(0, 1);
					break;
				}
				case "ArrowDown":
				case "s":
				case "S": {
					e.preventDefault();
					tryMove(1, 0);
					lastTickRef.current = performance.now();
					break;
				}
				case "ArrowUp":
				case "w":
				case "W": {
					e.preventDefault();
					tryRotate(1);
					break;
				}
				case "z":
				case "Z": {
					e.preventDefault();
					tryRotate(-1);
					break;
				}
			}
		}

		el.addEventListener("keydown", onKey);
		el.focus();
		return () => el.removeEventListener("keydown", onKey);
	}, [reset, tryMove, tryRotate, hardDrop]);

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
				<canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={CANVAS_STYLE} />
			</div>

			{/* Controls hint */}
			<div className="flex items-center justify-center gap-4">
				<span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
					← → Move
				</span>
				<span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
					↑ / Z Rotate
				</span>
				<span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
					Space: {status === "playing" ? "Drop" : "Start"}
				</span>
			</div>
		</div>
	);
}

export { TetrisGame as GamesTetrisTetrisGame };
export type { TetrisGameProps as GamesTetrisTetrisGameProps };
