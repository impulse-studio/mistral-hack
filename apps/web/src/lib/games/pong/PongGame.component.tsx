import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════
   Pong — Pixel Art Edition
   Player vs AI with increasing difficulty
   ═══════════════════════════════════════════════════════ */

// ── Canvas ──────────────────────────────────────────
const CANVAS_W = 400;
const CANVAS_H = 300;
const CANVAS_STYLE = {
	width: CANVAS_W,
	height: CANVAS_H,
	imageRendering: "pixelated" as const,
	display: "block" as const,
};

// ── Paddles ─────────────────────────────────────────
const PADDLE_W = 8;
const PADDLE_H = 48;
const PADDLE_MARGIN = 16;
const PADDLE_SPEED = 4;

// ── Ball ────────────────────────────────────────────
const BALL_SIZE = 8;
const BALL_BASE_SPEED = 3;
const BALL_MAX_SPEED = 7;
const BALL_SPEED_INCREMENT = 0.15;

const PONG_SCORE_STYLE_PLAYER = { color: "#22eedd" } as const;
const PONG_SCORE_STYLE_AI = { color: "#ff7000" } as const;

// ── AI ──────────────────────────────────────────────
const AI_BASE_SPEED = 2.5;
const AI_SPEED_INCREMENT = 0.1;
const AI_MAX_SPEED = 4.5;
const AI_REACTION_ZONE = 0.55; // only track ball when it's past this fraction of the field

// ── Scoring ─────────────────────────────────────────
const WIN_SCORE = 7;

// ── Palette (matches other games) ───────────────────
const P = {
	bg: "#0d0d1a",
	line: "#14142a",
	lineAccent: "#1e1e3a",
	paddle: "#22eedd",
	paddleOutline: "#054a42",
	paddleAI: "#ff7000",
	paddleAIOutline: "#993800",
	ball: "#ffaa00",
	ballGlow: "rgba(255, 170, 0, 0.25)",
	ballTrail: "rgba(255, 170, 0, 0.08)",
	textDim: "#666680",
	textBright: "#e8e8f0",
	accent: "#ff7000",
	win: "#22eedd",
	lose: "#ff3333",
	scoreDim: "#2a2a44",
};

// ── Types ───────────────────────────────────────────
type Status = "idle" | "playing" | "won" | "lost";

interface Ball {
	x: number;
	y: number;
	vx: number;
	vy: number;
	speed: number;
}

interface GameState {
	playerY: number;
	aiY: number;
	ball: Ball;
	playerScore: number;
	aiScore: number;
	status: Status;
	rally: number; // hits in current rally
	// Trail effect
	trail: Array<{ x: number; y: number; alpha: number }>;
}

// ── Helpers ─────────────────────────────────────────
function initBall(towardsPlayer: boolean): Ball {
	const angle = Math.random() * 0.8 - 0.4; // ±0.4 rad
	const dir = towardsPlayer ? Math.PI : 0;
	return {
		x: CANVAS_W / 2,
		y: CANVAS_H / 2,
		vx: Math.cos(dir + angle) * BALL_BASE_SPEED,
		vy: Math.sin(angle) * BALL_BASE_SPEED,
		speed: BALL_BASE_SPEED,
	};
}

function clamp(v: number, min: number, max: number) {
	return Math.max(min, Math.min(max, v));
}

// ── Component ───────────────────────────────────────
interface PongGameProps {
	className?: string;
}

function PongGame({ className }: PongGameProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const rafRef = useRef(0);
	const keysRef = useRef<Set<string>>(new Set());

	// Mutable game state (ref to avoid re-renders every frame)
	const g = useRef<GameState>({
		playerY: CANVAS_H / 2 - PADDLE_H / 2,
		aiY: CANVAS_H / 2 - PADDLE_H / 2,
		ball: initBall(false),
		playerScore: 0,
		aiScore: 0,
		status: "idle",
		rally: 0,
		trail: [],
	});

	// React state for UI
	const [playerScore, setPlayerScore] = useState(0);
	const [aiScore, setAiScore] = useState(0);
	const [status, setStatus] = useState<Status>("idle");

	// ── Reset ────────────────────────────────────────
	const reset = useCallback(() => {
		const s = g.current;
		s.playerY = CANVAS_H / 2 - PADDLE_H / 2;
		s.aiY = CANVAS_H / 2 - PADDLE_H / 2;
		s.ball = initBall(false);
		s.playerScore = 0;
		s.aiScore = 0;
		s.status = "playing";
		s.rally = 0;
		s.trail = [];
		setPlayerScore(0);
		setAiScore(0);
		setStatus("playing");
	}, []);

	// ── Serve after score ────────────────────────────
	const serve = useCallback((towardsPlayer: boolean) => {
		const s = g.current;
		s.ball = initBall(towardsPlayer);
		s.rally = 0;
		s.trail = [];
	}, []);

	// ── Update ───────────────────────────────────────
	const update = useCallback(() => {
		const s = g.current;
		if (s.status !== "playing") return;

		const keys = keysRef.current;

		// ── Player paddle movement ───────────────────
		if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) {
			s.playerY -= PADDLE_SPEED;
		}
		if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) {
			s.playerY += PADDLE_SPEED;
		}
		s.playerY = clamp(s.playerY, 0, CANVAS_H - PADDLE_H);

		// ── AI paddle movement ───────────────────────
		const aiSpeed = Math.min(AI_MAX_SPEED, AI_BASE_SPEED + s.rally * AI_SPEED_INCREMENT);
		const ballFraction = s.ball.x / CANVAS_W;

		if (s.ball.vx > 0 && ballFraction > AI_REACTION_ZONE) {
			const aiCenter = s.aiY + PADDLE_H / 2;
			const diff = s.ball.y - aiCenter;
			if (Math.abs(diff) > 4) {
				s.aiY += Math.sign(diff) * Math.min(aiSpeed, Math.abs(diff));
			}
		} else {
			// drift toward center when ball going away
			const aiCenter = s.aiY + PADDLE_H / 2;
			const centerDiff = CANVAS_H / 2 - aiCenter;
			if (Math.abs(centerDiff) > 2) {
				s.aiY += Math.sign(centerDiff) * 1.5;
			}
		}
		s.aiY = clamp(s.aiY, 0, CANVAS_H - PADDLE_H);

		// ── Ball trail ───────────────────────────────
		s.trail.push({ x: s.ball.x, y: s.ball.y, alpha: 0.5 });
		if (s.trail.length > 8) s.trail.shift();
		for (const t of s.trail) t.alpha *= 0.75;

		// ── Ball movement ────────────────────────────
		s.ball.x += s.ball.vx;
		s.ball.y += s.ball.vy;

		// ── Top/bottom wall bounce ───────────────────
		if (s.ball.y - BALL_SIZE / 2 <= 0) {
			s.ball.y = BALL_SIZE / 2;
			s.ball.vy = Math.abs(s.ball.vy);
		} else if (s.ball.y + BALL_SIZE / 2 >= CANVAS_H) {
			s.ball.y = CANVAS_H - BALL_SIZE / 2;
			s.ball.vy = -Math.abs(s.ball.vy);
		}

		// ── Player paddle collision ──────────────────
		const playerPaddleRight = PADDLE_MARGIN + PADDLE_W;
		if (
			s.ball.vx < 0 &&
			s.ball.x - BALL_SIZE / 2 <= playerPaddleRight &&
			s.ball.x + BALL_SIZE / 2 >= PADDLE_MARGIN &&
			s.ball.y >= s.playerY &&
			s.ball.y <= s.playerY + PADDLE_H
		) {
			s.ball.x = playerPaddleRight + BALL_SIZE / 2;
			const hitPos = (s.ball.y - s.playerY) / PADDLE_H; // 0..1
			const angle = (hitPos - 0.5) * (Math.PI / 3); // ±60°
			s.ball.speed = Math.min(BALL_MAX_SPEED, s.ball.speed + BALL_SPEED_INCREMENT);
			s.ball.vx = Math.cos(angle) * s.ball.speed;
			s.ball.vy = Math.sin(angle) * s.ball.speed;
			s.rally++;
		}

		// ── AI paddle collision ──────────────────────
		const aiPaddleLeft = CANVAS_W - PADDLE_MARGIN - PADDLE_W;
		if (
			s.ball.vx > 0 &&
			s.ball.x + BALL_SIZE / 2 >= aiPaddleLeft &&
			s.ball.x - BALL_SIZE / 2 <= CANVAS_W - PADDLE_MARGIN &&
			s.ball.y >= s.aiY &&
			s.ball.y <= s.aiY + PADDLE_H
		) {
			s.ball.x = aiPaddleLeft - BALL_SIZE / 2;
			const hitPos = (s.ball.y - s.aiY) / PADDLE_H;
			const angle = (hitPos - 0.5) * (Math.PI / 3);
			s.ball.speed = Math.min(BALL_MAX_SPEED, s.ball.speed + BALL_SPEED_INCREMENT);
			s.ball.vx = -Math.cos(angle) * s.ball.speed;
			s.ball.vy = Math.sin(angle) * s.ball.speed;
			s.rally++;
		}

		// ── Scoring ──────────────────────────────────
		if (s.ball.x < -BALL_SIZE) {
			// AI scores — serve toward AI (right)
			s.aiScore++;
			setAiScore(s.aiScore);
			if (s.aiScore >= WIN_SCORE) {
				s.status = "lost";
				setStatus("lost");
			} else {
				serve(false);
			}
		} else if (s.ball.x > CANVAS_W + BALL_SIZE) {
			// Player scores — serve toward player (left)
			s.playerScore++;
			setPlayerScore(s.playerScore);
			if (s.playerScore >= WIN_SCORE) {
				s.status = "won";
				setStatus("won");
			} else {
				serve(true);
			}
		}
	}, [serve]);

	// ── Draw: background + center line ──────────────
	const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
		ctx.fillStyle = P.bg;
		ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

		// Dashed center line
		ctx.strokeStyle = P.lineAccent;
		ctx.lineWidth = 2;
		ctx.setLineDash([8, 8]);
		ctx.beginPath();
		ctx.moveTo(CANVAS_W / 2, 0);
		ctx.lineTo(CANVAS_W / 2, CANVAS_H);
		ctx.stroke();
		ctx.setLineDash([]);

		// Center circle
		ctx.strokeStyle = P.line;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(CANVAS_W / 2, CANVAS_H / 2, 30, 0, Math.PI * 2);
		ctx.stroke();
	}, []);

	// ── Draw: scores on field ───────────────────────
	const drawFieldScores = useCallback((ctx: CanvasRenderingContext2D) => {
		const s = g.current;
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.font = "bold 48px monospace";
		ctx.fillStyle = P.scoreDim;
		ctx.fillText(String(s.playerScore), CANVAS_W / 2 - 50, 16);
		ctx.fillText(String(s.aiScore), CANVAS_W / 2 + 50, 16);
		ctx.textAlign = "start";
		ctx.textBaseline = "alphabetic";
	}, []);

	// ── Draw: paddles ───────────────────────────────
	const drawPaddles = useCallback((ctx: CanvasRenderingContext2D) => {
		const s = g.current;

		// Player paddle (left)
		ctx.fillStyle = P.paddleOutline;
		ctx.fillRect(PADDLE_MARGIN, s.playerY, PADDLE_W, PADDLE_H);
		ctx.fillStyle = P.paddle;
		ctx.fillRect(PADDLE_MARGIN + 2, s.playerY + 2, PADDLE_W - 4, PADDLE_H - 4);
		// Highlight
		ctx.fillStyle = "rgba(255,255,255,0.15)";
		ctx.fillRect(PADDLE_MARGIN + 2, s.playerY + 2, 2, PADDLE_H - 4);

		// AI paddle (right)
		const aiX = CANVAS_W - PADDLE_MARGIN - PADDLE_W;
		ctx.fillStyle = P.paddleAIOutline;
		ctx.fillRect(aiX, s.aiY, PADDLE_W, PADDLE_H);
		ctx.fillStyle = P.paddleAI;
		ctx.fillRect(aiX + 2, s.aiY + 2, PADDLE_W - 4, PADDLE_H - 4);
		// Highlight
		ctx.fillStyle = "rgba(255,255,255,0.15)";
		ctx.fillRect(aiX + PADDLE_W - 4, s.aiY + 2, 2, PADDLE_H - 4);
	}, []);

	// ── Draw: ball with trail + glow ────────────────
	const drawBall = useCallback((ctx: CanvasRenderingContext2D) => {
		const s = g.current;

		// Trail
		for (const t of s.trail) {
			if (t.alpha < 0.02) continue;
			ctx.globalAlpha = t.alpha;
			ctx.fillStyle = P.ballTrail;
			ctx.fillRect(t.x - BALL_SIZE / 2 - 1, t.y - BALL_SIZE / 2 - 1, BALL_SIZE + 2, BALL_SIZE + 2);
		}
		ctx.globalAlpha = 1;

		// Glow
		ctx.fillStyle = P.ballGlow;
		ctx.fillRect(
			s.ball.x - BALL_SIZE - 2,
			s.ball.y - BALL_SIZE - 2,
			BALL_SIZE * 2 + 4,
			BALL_SIZE * 2 + 4,
		);

		// Ball
		ctx.fillStyle = P.ball;
		ctx.fillRect(s.ball.x - BALL_SIZE / 2, s.ball.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);

		// Ball pixel highlight
		ctx.fillStyle = "rgba(255,255,255,0.3)";
		ctx.fillRect(s.ball.x - BALL_SIZE / 2, s.ball.y - BALL_SIZE / 2, 2, 2);
	}, []);

	// ── Draw: overlay ───────────────────────────────
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

		function loop() {
			const s = g.current;

			update();

			drawBackground(ctx!);
			drawFieldScores(ctx!);
			drawPaddles(ctx!);
			drawBall(ctx!);

			if (s.status === "idle") {
				drawOverlay(ctx!, "PONG", "Press SPACE to start", P.accent);
			} else if (s.status === "won") {
				drawOverlay(
					ctx!,
					"YOU WIN!",
					`${s.playerScore}-${s.aiScore}  —  SPACE to play again`,
					P.win,
				);
			} else if (s.status === "lost") {
				drawOverlay(ctx!, "GAME OVER", `${s.playerScore}-${s.aiScore}  —  SPACE to retry`, P.lose);
			}

			rafRef.current = requestAnimationFrame(loop);
		}

		rafRef.current = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(rafRef.current);
	}, [update, drawBackground, drawFieldScores, drawPaddles, drawBall, drawOverlay]);

	// ── Keyboard ─────────────────────────────────────
	useEffect(() => {
		const el = wrapRef.current;
		if (!el) return;

		function onKeyDown(e: KeyboardEvent) {
			const s = g.current;

			if (e.code === "Space") {
				e.preventDefault();
				if (s.status !== "playing") reset();
				return;
			}

			if (s.status !== "playing") return;

			if (["ArrowUp", "ArrowDown", "w", "W", "s", "S"].includes(e.key)) {
				e.preventDefault();
				keysRef.current.add(e.key);
			}
		}

		function onKeyUp(e: KeyboardEvent) {
			keysRef.current.delete(e.key);
		}

		el.addEventListener("keydown", onKeyDown);
		el.addEventListener("keyup", onKeyUp);
		el.focus();
		return () => {
			el.removeEventListener("keydown", onKeyDown);
			el.removeEventListener("keyup", onKeyUp);
		};
	}, [reset]);

	return (
		<div
			ref={wrapRef}
			tabIndex={0}
			className={cn("inline-flex flex-col gap-2 outline-none focus:outline-none", className)}
		>
			{/* Score bar */}
			<div className="flex items-center justify-between border-2 border-border bg-card px-3 py-1.5 shadow-pixel inset-shadow-pixel">
				<span
					className="font-mono text-[10px] font-semibold uppercase tracking-widest"
					style={PONG_SCORE_STYLE_PLAYER}
				>
					You: {playerScore}
				</span>
				<span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
					First to {WIN_SCORE}
				</span>
				<span
					className="font-mono text-[10px] font-semibold uppercase tracking-widest"
					style={PONG_SCORE_STYLE_AI}
				>
					AI: {aiScore}
				</span>
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
					W/S / Arrows
				</span>
				<span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
					Space: {status === "playing" ? "—" : "Start"}
				</span>
			</div>
		</div>
	);
}

export { PongGame as GamesPongGame };
export type { PongGameProps as GamesPongGameProps };
