/**
 * Office canvas wrapper — drives the pixelAgents engine
 * without the editor-dependent OfficeCanvas from lib/pixelAgents.
 * Uses OfficeState + renderFrame + startGameLoop directly.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ZOOM_MAX, ZOOM_MIN, CAT_RENDER_WIDTH } from "@/lib/pixelAgents/constants";
import { startGameLoop } from "@/lib/pixelAgents/gameLoop";
import type { OfficeState } from "@/lib/pixelAgents/officeState";
import { renderFrame } from "@/lib/pixelAgents/renderer";
import { TILE_SIZE } from "@/lib/pixelAgents/types";

/** Step down from ZOOM_MAX until the office map fits within the container. */
function computeFitZoom(
	containerWidth: number,
	containerHeight: number,
	cols: number,
	rows: number,
): number {
	const baseW = cols * TILE_SIZE;
	const baseH = rows * TILE_SIZE;
	for (let z = ZOOM_MAX; z > ZOOM_MIN; z--) {
		if (baseW * z <= containerWidth && baseH * z <= containerHeight) {
			return z;
		}
	}
	return ZOOM_MIN;
}

/** Furniture UIDs that show pointer cursor on hover and fire onClickFurniture */
const CLICKABLE_FURNITURE = new Set([
	"game-table",
	"game-laptop",
	"bookshelf-mgr-1",
	"bookshelf-mgr-2",
	"mistral-cat",
]);

/** Predefined paper positions relative to the first bookshelf (col 21, row 2).
 *  Two bookshelves side by side = 32px wide, 32px tall in world space.
 *  Tileset bookshelf: 16x32px, backgroundTiles=1 (top tile is bg).
 *  Shelves span roughly sprite rows 2-26. Papers placed ON shelves. */
const PAPER_SLOTS: Array<{
	x: number;
	y: number;
	w: number;
	h: number;
	color: string;
	angle: number;
}> = [
	// ── Bookshelf 1 (center≈7) — 6 papers ──
	{ x: 6, y: 2, w: 3, h: 4, color: "#f5f0e0", angle: 0.1 },
	{ x: 7, y: 8, w: 3, h: 4, color: "#f0ead0", angle: -0.12 },
	{ x: 5, y: 14, w: 3, h: 4, color: "#fffae8", angle: 0.15 },
	{ x: 7, y: 20, w: 3, h: 4, color: "#f5edd8", angle: -0.08 },
	{ x: 8, y: 5, w: 3, h: 4, color: "#fff8e0", angle: 0.2 },
	{ x: 6, y: 11, w: 3, h: 4, color: "#fffae8", angle: -0.18 },
	// ── Bookshelf 2 (center≈23) — 6 papers, mirrored Y ──
	{ x: 22, y: 2, w: 3, h: 4, color: "#fff8e8", angle: -0.1 },
	{ x: 21, y: 8, w: 3, h: 4, color: "#fff5d5", angle: 0.12 },
	{ x: 23, y: 14, w: 3, h: 4, color: "#fff0d0", angle: -0.15 },
	{ x: 21, y: 20, w: 3, h: 4, color: "#ffe8c0", angle: 0.08 },
	{ x: 20, y: 5, w: 3, h: 4, color: "#f5edd8", angle: -0.2 },
	{ x: 22, y: 11, w: 3, h: 4, color: "#f8f2e0", angle: 0.18 },
];

/** Bookshelf-mgr-1 is at col 21, row 2 in the default layout */
const BOOKSHELF_BASE_COL = 21;
const BOOKSHELF_BASE_ROW = 2;

function renderDocumentPapers(
	ctx: CanvasRenderingContext2D,
	offsetX: number,
	offsetY: number,
	zoom: number,
	count: number,
): void {
	const visible = Math.min(count, PAPER_SLOTS.length);
	if (visible === 0) return;

	const baseX = BOOKSHELF_BASE_COL * TILE_SIZE;
	const baseY = BOOKSHELF_BASE_ROW * TILE_SIZE;

	for (let i = 0; i < visible; i++) {
		const p = PAPER_SLOTS[i];
		const px = offsetX + (baseX + p.x) * zoom;
		const py = offsetY + (baseY + p.y) * zoom;
		const pw = p.w * zoom;
		const ph = p.h * zoom;

		ctx.save();
		ctx.translate(px + pw / 2, py + ph / 2);
		ctx.rotate(p.angle);

		// Paper body
		ctx.fillStyle = p.color;
		ctx.fillRect(-pw / 2, -ph / 2, pw, ph);

		// Corner fold (top-right triangle)
		const foldSize = Math.max(1, zoom);
		ctx.fillStyle = "#d8d0b8";
		ctx.beginPath();
		ctx.moveTo(pw / 2 - foldSize, -ph / 2);
		ctx.lineTo(pw / 2, -ph / 2 + foldSize);
		ctx.lineTo(pw / 2, -ph / 2);
		ctx.closePath();
		ctx.fill();

		// Thin text lines
		ctx.fillStyle = "#c0b898";
		const lineH = Math.max(0.5, zoom * 0.5);
		for (let line = 0; line < 3; line++) {
			const ly = -ph / 2 + (line + 1.5) * (ph / 5);
			const lw = pw * (line === 2 ? 0.5 : 0.7);
			ctx.fillRect(-pw / 2 + zoom, ly, lw, lineH);
		}

		ctx.restore();
	}
}

interface OfficeCanvasProps {
	officeState: OfficeState;
	onClickAgent: (agentId: number) => void;
	onClickFurniture?: (uid: string) => void;
	documentCount?: number;
}

export function OfficeCanvas({
	officeState,
	onClickAgent,
	onClickFurniture,
	documentCount = 0,
}: OfficeCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [zoom, setZoom] = useState(ZOOM_MIN); // placeholder until container measured
	const zoomRef = useRef(ZOOM_MIN);
	const panRef = useRef({ x: 0, y: 0 });
	const zoomAccRef = useRef(0);
	const initialZoomSet = useRef(false);
	const docCountRef = useRef(0);

	// Cat overlay: two DOM imgs so the browser natively animates GIF/WebP
	const catWalkRef = useRef<HTMLImageElement>(null);
	const catSitRef = useRef<HTMLImageElement>(null);
	const catPrevWalkingRef = useRef(false);

	useEffect(() => {
		zoomRef.current = zoom;
	}, [zoom]);

	useEffect(() => {
		docCountRef.current = documentCount;
	}, [documentCount]);

	// Resize canvas to container (DPR-aware for crisp pixels)
	// On first measure, also compute the best-fit zoom for the office.
	const resize = useCallback(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) return;
		const dpr = window.devicePixelRatio || 1;
		const w = container.clientWidth;
		const h = container.clientHeight;
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		canvas.style.width = `${w}px`;
		canvas.style.height = `${h}px`;

		if (!initialZoomSet.current && w > 0 && h > 0) {
			initialZoomSet.current = true;
			const layout = officeState.getLayout();
			const fitZoom = computeFitZoom(w, h, layout.cols, layout.rows);
			setZoom(fitZoom);
			zoomRef.current = fitZoom;
		}
	}, [officeState]);

	useEffect(() => {
		resize();
		const ro = new ResizeObserver(resize);
		if (containerRef.current) ro.observe(containerRef.current);
		return () => ro.disconnect();
	}, [resize]);

	// Game loop: update state + render each frame
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const stopLoop = startGameLoop(canvas, {
			update(dt) {
				officeState.update(dt);
			},
			render(ctx) {
				const dpr = window.devicePixelRatio || 1;
				const w = canvas.width / dpr;
				const h = canvas.height / dpr;

				ctx.save();
				ctx.scale(dpr, dpr);

				const layout = officeState.getLayout();
				const { offsetX, offsetY } = renderFrame(
					ctx,
					w,
					h,
					officeState.tileMap,
					officeState.furniture,
					[...officeState.characters.values()],
					zoomRef.current,
					panRef.current.x,
					panRef.current.y,
					undefined,
					undefined,
					layout.tileColors,
					layout.cols,
					layout.rows,
				);

				// Draw document paper sprites on manager bookshelves
				if (docCountRef.current > 0) {
					renderDocumentPapers(ctx, offsetX, offsetY, zoomRef.current, docCountRef.current);
				}

				ctx.restore();

				// ── Position the cat HTML overlay ──
				const cat = officeState.walkingCat;
				const isWalking = cat.path.length > 0;
				const walkEl = catWalkRef.current;
				const sitEl = catSitRef.current;

				// Toggle which img is visible
				if (isWalking !== catPrevWalkingRef.current) {
					catPrevWalkingRef.current = isWalking;
					if (walkEl) walkEl.style.display = isWalking ? "block" : "none";
					if (sitEl) sitEl.style.display = isWalking ? "none" : "block";
				}

				const activeEl = isWalking ? walkEl : sitEl;
				if (activeEl) {
					const z = zoomRef.current;
					const catScreenW = CAT_RENDER_WIDTH * z;
					const ratio =
						activeEl.naturalWidth > 0 ? activeEl.naturalHeight / activeEl.naturalWidth : 0.8;
					const catScreenH = catScreenW * ratio;
					const screenX = offsetX + cat.x * z - catScreenW / 2;
					const screenY = offsetY + cat.y * z - catScreenH;

					activeEl.style.left = `${screenX}px`;
					activeEl.style.top = `${screenY}px`;
					activeEl.style.width = `${catScreenW}px`;
					activeEl.style.height = `${catScreenH}px`;
					activeEl.style.transform = cat.facingLeft ? "scaleX(-1)" : "none";
				}
			},
		});

		return stopLoop;
	}, [officeState]);

	// Zoom via mouse wheel
	const handleWheel = useCallback((e: React.WheelEvent) => {
		e.preventDefault();
		zoomAccRef.current += e.deltaY;
		const threshold = 50;
		if (Math.abs(zoomAccRef.current) < threshold) return;
		const dir = zoomAccRef.current < 0 ? 1 : -1;
		zoomAccRef.current = 0;
		setZoom((z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z + dir)));
	}, []);

	// Click → hit-test agents
	const handleClick = useCallback(
		(e: React.MouseEvent) => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const rect = canvas.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;
			const clientX = e.clientX - rect.left;
			const clientY = e.clientY - rect.top;
			const z = zoomRef.current;
			const w = canvas.width / dpr;
			const h = canvas.height / dpr;
			const layout = officeState.getLayout();

			const mapW = layout.cols * TILE_SIZE * z;
			const mapH = layout.rows * TILE_SIZE * z;
			const offsetX = Math.floor((w - mapW) / 2) + Math.round(panRef.current.x);
			const offsetY = Math.floor((h - mapH) / 2) + Math.round(panRef.current.y);
			const worldX = (clientX - offsetX) / z;
			const worldY = (clientY - offsetY) / z;

			const agentId = officeState.getCharacterAt(worldX, worldY);
			if (agentId !== null) {
				officeState.selectedAgentId = agentId;
				onClickAgent(agentId);
			} else if (officeState.isCatAt(worldX, worldY) && onClickFurniture) {
				onClickFurniture("mistral-cat");
			} else {
				// Check if clicked on furniture
				const furnitureUid = officeState.getFurnitureUidAt(worldX, worldY);
				if (furnitureUid === "pc-mgr") {
					officeState.selectedAgentId = 0;
					onClickAgent(0);
				} else if (furnitureUid && onClickFurniture) {
					onClickFurniture(furnitureUid);
				} else {
					officeState.selectedAgentId = null;
					onClickAgent(-1);
				}
			}
		},
		[officeState, onClickAgent, onClickFurniture],
	);

	// Pan via middle-mouse drag
	const isPanning = useRef(false);
	const panStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

	const handlePointerDown = useCallback((e: React.PointerEvent) => {
		if (e.button === 1 || e.button === 2) {
			isPanning.current = true;
			panStart.current = {
				mx: e.clientX,
				my: e.clientY,
				px: panRef.current.x,
				py: panRef.current.y,
			};
			(e.target as HTMLElement).setPointerCapture(e.pointerId);
			e.preventDefault();
		}
	}, []);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent) => {
			if (isPanning.current) {
				panRef.current.x = panStart.current.px + (e.clientX - panStart.current.mx);
				panRef.current.y = panStart.current.py + (e.clientY - panStart.current.my);
				return;
			}
			// Cursor feedback: pointer for agents + clickable furniture
			const canvas = canvasRef.current;
			if (!canvas) return;
			const rect = canvas.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;
			const cx = e.clientX - rect.left;
			const cy = e.clientY - rect.top;
			const z = zoomRef.current;
			const w = canvas.width / dpr;
			const h = canvas.height / dpr;
			const layout = officeState.getLayout();
			const mapW = layout.cols * TILE_SIZE * z;
			const mapH = layout.rows * TILE_SIZE * z;
			const ox = Math.floor((w - mapW) / 2) + Math.round(panRef.current.x);
			const oy = Math.floor((h - mapH) / 2) + Math.round(panRef.current.y);
			const wx = (cx - ox) / z;
			const wy = (cy - oy) / z;

			const hitAgent = officeState.getCharacterAt(wx, wy);
			if (hitAgent !== null) {
				canvas.style.cursor = "pointer";
				return;
			}
			if (officeState.isCatAt(wx, wy)) {
				canvas.style.cursor = "pointer";
				return;
			}
			const hitFurn = officeState.getFurnitureUidAt(wx, wy);
			if (hitFurn && (hitFurn === "pc-mgr" || CLICKABLE_FURNITURE.has(hitFurn))) {
				canvas.style.cursor = "pointer";
				return;
			}
			canvas.style.cursor = "default";
		},
		[officeState],
	);

	const handlePointerUp = useCallback(() => {
		isPanning.current = false;
	}, []);

	return (
		<div ref={containerRef} className="relative h-full w-full overflow-hidden">
			<canvas
				ref={canvasRef}
				onWheel={handleWheel}
				onClick={handleClick}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onContextMenu={(e) => e.preventDefault()}
				className="absolute inset-0 cursor-default"
			/>

			{/* Cat overlay — real DOM imgs so the browser natively animates GIF/WebP */}
			<img
				ref={catWalkRef}
				src="/assets/cat-walking-white.gif"
				alt=""
				className="pointer-events-none absolute"
				style={{ imageRendering: "pixelated" }}
			/>
			<img
				ref={catSitRef}
				src="/assets/animated-sitting-cat.webp"
				alt=""
				className="pointer-events-none absolute"
				style={{ imageRendering: "pixelated", display: "none" }}
			/>

			{/* Zoom controls */}
			<div className="absolute bottom-4 right-4 flex flex-col items-center gap-1 font-mono text-[10px]">
				<Button
					variant="default"
					size="icon-sm"
					className="text-muted-foreground"
					onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + 1))}
				>
					+
				</Button>
				<span className="text-muted-foreground">{zoom}×</span>
				<Button
					variant="default"
					size="icon-sm"
					className="text-muted-foreground"
					onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - 1))}
				>
					−
				</Button>
			</div>
		</div>
	);
}
