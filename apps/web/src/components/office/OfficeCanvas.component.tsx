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

interface OfficeCanvasProps {
	officeState: OfficeState;
	onClickAgent: (agentId: number) => void;
	initialZoom?: number;
}

export function OfficeCanvas({ officeState, onClickAgent, initialZoom = 3 }: OfficeCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [zoom, setZoom] = useState(initialZoom);
	const zoomRef = useRef(initialZoom);
	const panRef = useRef({ x: 0, y: 0 });
	const zoomAccRef = useRef(0);

	useEffect(() => {
		zoomRef.current = zoom;
	}, [zoom]);

	// Resize canvas to container (DPR-aware for crisp pixels)
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
	}, []);

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
				officeState.selectedAgentId = null;
				onClickAgent(-1);
			}
		},
		[officeState, onClickAgent],
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

	const handlePointerMove = useCallback((e: React.PointerEvent) => {
		if (!isPanning.current) return;
		panRef.current.x = panStart.current.px + (e.clientX - panStart.current.mx);
		panRef.current.y = panStart.current.py + (e.clientY - panStart.current.my);
	}, []);

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
