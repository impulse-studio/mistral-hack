/**
 * Office canvas wrapper — drives the pixelAgents engine
 * without the editor-dependent OfficeCanvas from lib/pixelAgents.
 * Uses OfficeState + renderFrame + startGameLoop directly.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ZOOM_MAX, ZOOM_MIN } from "@/lib/pixelAgents/constants";
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

interface OfficeCanvasProps {
	officeState: OfficeState;
	onClickAgent: (agentId: number) => void;
	onClickFurniture?: (uid: string) => void;
}

export function OfficeCanvas({ officeState, onClickAgent, onClickFurniture }: OfficeCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [zoom, setZoom] = useState(ZOOM_MIN); // placeholder until container measured
	const zoomRef = useRef(ZOOM_MIN);
	const panRef = useRef({ x: 0, y: 0 });
	const zoomAccRef = useRef(0);
	const initialZoomSet = useRef(false);

	useEffect(() => {
		zoomRef.current = zoom;
	}, [zoom]);

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
				renderFrame(
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

				ctx.restore();
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
