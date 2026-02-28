import { createFileRoute } from "@tanstack/react-router";
import { useRef, useEffect, useCallback } from "react";

export const Route = createFileRoute("/proto/v8")({
	component: PixelOfficeV8,
});

const COLS = 28;
const ROWS = 14;
const PX = 3;
/** @internal 48px per tile — kept for reference */
// const CELL = 16 * PX

// ── Palette ─────────────────────────────────────────────
const C = {
	// Floors
	woodLight: "#b5864a",
	woodDark: "#9e7340",
	cream: "#c8b898",
	creamDark: "#b8a888",
	teal: "#2a6b5a",
	tealDark: "#22594b",

	// Walls
	wallTop: "#8b8b8b",
	wallFace: "#6e6e6e",
	wallDark: "#555555",
	wallAccent: "#7a7a7a",

	// Furniture
	deskTop: "#c4956a",
	deskFront: "#a07850",
	deskLeg: "#7a5c3a",
	chairSeat: "#3a3a3a",
	chairBack: "#2e2e2e",
	monitor: "#1a1a2e",
	monitorScreen: "#4a90d9",
	monitorStand: "#333333",
	keyboard: "#444444",

	// Bookshelf
	shelfFrame: "#6b4226",
	shelfBoard: "#8b5e3c",
	book1: "#c0392b",
	book2: "#2980b9",
	book3: "#27ae60",
	book4: "#f39c12",
	book5: "#8e44ad",

	// Break room
	coolerBody: "#d5dde8",
	coolerTop: "#a8b8c8",
	coolerWater: "#5ba3d9",
	coolerBase: "#8898a8",
	tableTop: "#d4a76a",
	tableLeg: "#8b6b3a",
	cup: "#e8e0d0",
	cupCoffee: "#6b3a1a",

	// Manager office
	bigDeskTop: "#5a3a1a",
	bigDeskFront: "#4a2e12",
	bigDeskTrim: "#7a5030",
	paintFrame: "#c8a830",
	paintCanvas: "#f0e8d0",
	paintMtn: "#5a8a5a",
	paintSky: "#87ceeb",
	paintSun: "#f0c040",
	lamp: "#d4a030",
	lampShade: "#f0d870",
	lampPole: "#888888",

	// Characters
	skin1: "#f5c5a3",
	skin2: "#d4a373",
	skin3: "#8b6347",
	hair1: "#2c1810",
	hair2: "#c8841c",
	hair3: "#6b2f1a",
	hair4: "#e8d4a0",
	hair5: "#1a1a2e",
	shirt1: "#3a7bd5",
	shirt2: "#d94040",
	shirt3: "#5aaa5a",
	shirt4: "#8855aa",
	shirt5: "#d98030",
	pants: "#2a2a40",
	shoes: "#1a1a1a",
};

// ── Types ───────────────────────────────────────────────
interface Character {
	x: number;
	y: number;
	skin: string;
	hair: string;
	shirt: string;
	dir: number; // 0=down, 1=up, 2=left, 3=right
	frame: number;
	label: string;
}

// ── Drawing helpers ─────────────────────────────────────
function px(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	color: string,
) {
	ctx.fillStyle = color;
	ctx.fillRect(x * PX, y * PX, w * PX, h * PX);
}

// ── Floor tile renderers ────────────────────────────────
function drawWoodFloor(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
	const bx = tx * 16;
	const by = ty * 16;
	const light = (tx + ty) % 2 === 0;
	px(ctx, bx, by, 16, 16, light ? C.woodLight : C.woodDark);
	// plank lines
	px(ctx, bx, by + 4, 16, 1, light ? C.woodDark : C.woodLight);
	px(ctx, bx, by + 10, 16, 1, light ? C.woodDark : C.woodLight);
}

function drawCreamFloor(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
	const bx = tx * 16;
	const by = ty * 16;
	const light = (tx + ty) % 2 === 0;
	px(ctx, bx, by, 16, 16, light ? C.cream : C.creamDark);
	// subtle tile pattern
	px(ctx, bx, by, 16, 1, C.creamDark);
	px(ctx, bx, by, 1, 16, C.creamDark);
}

function drawTealCarpet(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
	const bx = tx * 16;
	const by = ty * 16;
	const light = (tx + ty) % 2 === 0;
	px(ctx, bx, by, 16, 16, light ? C.teal : C.tealDark);
	// carpet texture dots
	if ((tx + ty) % 3 === 0) {
		px(ctx, bx + 4, by + 4, 1, 1, C.tealDark);
		px(ctx, bx + 11, by + 10, 1, 1, C.tealDark);
	}
}

// ── Wall renderers ──────────────────────────────────────
function drawWallTop(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
	const bx = tx * 16;
	const by = ty * 16;
	// top of wall
	px(ctx, bx, by, 16, 10, C.wallTop);
	px(ctx, bx, by + 10, 16, 4, C.wallFace);
	px(ctx, bx, by + 14, 16, 2, C.wallDark);
	// baseboard
	px(ctx, bx, by + 13, 16, 1, C.wallAccent);
}

// Vertical wall separator (1 tile wide)
function drawVertWall(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
	const bx = tx * 16;
	const by = ty * 16;
	px(ctx, bx, by, 16, 16, C.wallFace);
	px(ctx, bx, by, 2, 16, C.wallDark);
	px(ctx, bx + 14, by, 2, 16, C.wallDark);
	px(ctx, bx + 6, by, 4, 16, C.wallAccent);
}

// Horizontal wall separator (1 tile tall)
function drawHorizWall(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
	const bx = tx * 16;
	const by = ty * 16;
	px(ctx, bx, by, 16, 16, C.wallFace);
	px(ctx, bx, by, 16, 2, C.wallDark);
	px(ctx, bx, by + 14, 16, 2, C.wallDark);
	px(ctx, bx, by + 6, 16, 4, C.wallAccent);
}

// Door gap in wall
function drawDoorH(
	ctx: CanvasRenderingContext2D,
	tx: number,
	ty: number,
	floorFn: typeof drawWoodFloor,
) {
	floorFn(ctx, tx, ty);
	const bx = tx * 16;
	const by = ty * 16;
	// door frame sides
	px(ctx, bx, by, 2, 16, C.wallDark);
	px(ctx, bx + 14, by, 2, 16, C.wallDark);
}

function drawDoorV(
	ctx: CanvasRenderingContext2D,
	tx: number,
	ty: number,
	floorFn: typeof drawWoodFloor,
) {
	floorFn(ctx, tx, ty);
	const bx = tx * 16;
	const by = ty * 16;
	px(ctx, bx, by, 16, 2, C.wallDark);
	px(ctx, bx, by + 14, 16, 2, C.wallDark);
}

// ── Furniture renderers ─────────────────────────────────
function drawDesk(ctx: CanvasRenderingContext2D, tx: number, ty: number, withMonitor: boolean) {
	const bx = tx * 16;
	const by = ty * 16;
	// desk surface
	px(ctx, bx + 1, by + 4, 14, 3, C.deskTop);
	px(ctx, bx + 1, by + 7, 14, 2, C.deskFront);
	// legs
	px(ctx, bx + 2, by + 9, 2, 5, C.deskLeg);
	px(ctx, bx + 12, by + 9, 2, 5, C.deskLeg);

	if (withMonitor) {
		// monitor
		px(ctx, bx + 5, by, 6, 4, C.monitor);
		px(ctx, bx + 6, by + 1, 4, 2, C.monitorScreen);
		px(ctx, bx + 7, by + 4, 2, 1, C.monitorStand);
		// keyboard
		px(ctx, bx + 4, by + 5, 5, 1, C.keyboard);
	}
}

function drawChair(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
	const bx = tx * 16;
	const by = ty * 16;
	// seat
	px(ctx, bx + 4, by + 6, 8, 4, C.chairSeat);
	// back
	px(ctx, bx + 4, by + 3, 8, 3, C.chairBack);
	// legs
	px(ctx, bx + 5, by + 10, 2, 4, C.chairSeat);
	px(ctx, bx + 9, by + 10, 2, 4, C.chairSeat);
	// wheels
	px(ctx, bx + 4, by + 13, 1, 1, C.wallDark);
	px(ctx, bx + 11, by + 13, 1, 1, C.wallDark);
}

function drawBookshelf(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
	const bx = tx * 16;
	const by = ty * 16;
	// frame
	px(ctx, bx + 1, by + 1, 14, 14, C.shelfFrame);
	// shelves
	px(ctx, bx + 2, by + 5, 12, 1, C.shelfBoard);
	px(ctx, bx + 2, by + 9, 12, 1, C.shelfBoard);
	px(ctx, bx + 2, by + 13, 12, 1, C.shelfBoard);
	// books - top shelf
	px(ctx, bx + 3, by + 2, 2, 3, C.book1);
	px(ctx, bx + 5, by + 2, 2, 3, C.book2);
	px(ctx, bx + 7, by + 3, 2, 2, C.book3);
	px(ctx, bx + 10, by + 2, 2, 3, C.book4);
	// books - middle shelf
	px(ctx, bx + 3, by + 6, 2, 3, C.book5);
	px(ctx, bx + 6, by + 6, 3, 3, C.book1);
	px(ctx, bx + 10, by + 7, 2, 2, C.book2);
	// books - bottom shelf
	px(ctx, bx + 3, by + 10, 3, 3, C.book3);
	px(ctx, bx + 7, by + 10, 2, 3, C.book4);
	px(ctx, bx + 10, by + 10, 2, 3, C.book5);
}

function drawWaterCooler(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
	const bx = tx * 16;
	const by = ty * 16;
	// bottle
	px(ctx, bx + 5, by + 1, 6, 3, C.coolerWater);
	px(ctx, bx + 6, by + 0, 4, 1, C.coolerWater);
	// body
	px(ctx, bx + 4, by + 4, 8, 7, C.coolerBody);
	px(ctx, bx + 4, by + 4, 8, 1, C.coolerTop);
	// spout
	px(ctx, bx + 4, by + 7, 1, 2, C.wallDark);
	// base
	px(ctx, bx + 3, by + 11, 10, 3, C.coolerBase);
}

function drawBreakTable(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
	const bx = tx * 16;
	const by = ty * 16;
	// tabletop (2 tiles wide worth in 1 tile)
	px(ctx, bx + 1, by + 4, 14, 3, C.tableTop);
	px(ctx, bx + 1, by + 7, 14, 1, C.tableLeg);
	// legs
	px(ctx, bx + 2, by + 8, 2, 6, C.tableLeg);
	px(ctx, bx + 12, by + 8, 2, 6, C.tableLeg);
	// cups
	px(ctx, bx + 4, by + 2, 3, 2, C.cup);
	px(ctx, bx + 5, by + 1, 1, 1, C.cupCoffee);
	px(ctx, bx + 10, by + 3, 2, 1, C.cup);
}

function drawManagerDesk(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
	const bx = tx * 16;
	const by = ty * 16;
	// large desk surface
	px(ctx, bx, by + 4, 16, 4, C.bigDeskTop);
	px(ctx, bx, by + 3, 16, 1, C.bigDeskTrim);
	px(ctx, bx, by + 8, 16, 2, C.bigDeskFront);
	// legs
	px(ctx, bx + 1, by + 10, 3, 4, C.bigDeskFront);
	px(ctx, bx + 12, by + 10, 3, 4, C.bigDeskFront);
	// monitor
	px(ctx, bx + 5, by, 6, 3, C.monitor);
	px(ctx, bx + 6, by + 1, 4, 1, C.monitorScreen);
	// nameplate
	px(ctx, bx + 10, by + 5, 4, 2, C.paintFrame);
}

function drawPainting(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
	const bx = tx * 16;
	const by = ty * 16;
	// frame
	px(ctx, bx + 2, by + 2, 12, 10, C.paintFrame);
	// canvas
	px(ctx, bx + 3, by + 3, 10, 8, C.paintCanvas);
	// sky
	px(ctx, bx + 3, by + 3, 10, 4, C.paintSky);
	// sun
	px(ctx, bx + 10, by + 3, 2, 2, C.paintSun);
	// mountains
	px(ctx, bx + 3, by + 6, 3, 2, C.paintMtn);
	px(ctx, bx + 5, by + 5, 3, 3, C.paintMtn);
	px(ctx, bx + 9, by + 6, 3, 2, C.paintMtn);
	// ground
	px(ctx, bx + 3, by + 8, 10, 3, C.paintMtn);
}

function drawFloorLamp(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
	const bx = tx * 16;
	const by = ty * 16;
	// shade
	px(ctx, bx + 4, by + 1, 8, 4, C.lampShade);
	px(ctx, bx + 5, by + 0, 6, 1, C.lamp);
	// pole
	px(ctx, bx + 7, by + 5, 2, 8, C.lampPole);
	// base
	px(ctx, bx + 5, by + 13, 6, 2, C.lampPole);
}

// ── Character renderer ──────────────────────────────────
function drawCharacter(ctx: CanvasRenderingContext2D, ch: Character, _time: number) {
	const bx = ch.x * 16;
	const by = ch.y * 16;
	const bounce = ch.frame % 2 === 0 ? 0 : -1;

	// Shadow
	px(ctx, bx + 3, by + 14, 10, 2, "rgba(0,0,0,0.15)");

	// Feet / shoes
	px(ctx, bx + 4, by + 13 + bounce, 3, 2, C.shoes);
	px(ctx, bx + 9, by + 13 + bounce, 3, 2, C.shoes);

	// Pants
	px(ctx, bx + 4, by + 9 + bounce, 3, 4, C.pants);
	px(ctx, bx + 9, by + 9 + bounce, 3, 4, C.pants);
	px(ctx, bx + 7, by + 9 + bounce, 2, 2, C.pants);

	// Shirt / body
	px(ctx, bx + 3, by + 4 + bounce, 10, 5, ch.shirt);
	// Arms
	if (ch.dir === 0 || ch.dir === 1) {
		px(ctx, bx + 2, by + 5 + bounce, 2, 4, ch.shirt);
		px(ctx, bx + 12, by + 5 + bounce, 2, 4, ch.shirt);
	} else {
		px(ctx, bx + 3, by + 5 + bounce, 2, 4, ch.shirt);
		px(ctx, bx + 11, by + 5 + bounce, 2, 4, ch.shirt);
	}

	// Head
	px(ctx, bx + 4, by + 0 + bounce, 8, 4, ch.skin);
	// Eyes
	if (ch.dir !== 1) {
		px(ctx, bx + 5, by + 2 + bounce, 2, 1, "#1a1a1a");
		px(ctx, bx + 9, by + 2 + bounce, 2, 1, "#1a1a1a");
	}
	// Hair
	px(ctx, bx + 3, by + 0 + bounce, 10, 1, ch.hair);
	px(ctx, bx + 4, by - 1 + bounce, 8, 1, ch.hair);
	if (ch.dir === 1) {
		px(ctx, bx + 3, by + 1 + bounce, 1, 2, ch.hair);
		px(ctx, bx + 12, by + 1 + bounce, 1, 2, ch.hair);
	}

	// Label
	ctx.fillStyle = "#ffffff";
	ctx.font = `${9 * PX}px monospace`;
	ctx.textAlign = "center";
	const textX = (bx + 8) * PX;
	const textY = (by - 2 + bounce) * PX;
	const metrics = ctx.measureText(ch.label);
	const pad = 2 * PX;
	ctx.fillStyle = "rgba(0,0,0,0.55)";
	ctx.fillRect(textX - metrics.width / 2 - pad, textY - 8 * PX, metrics.width + pad * 2, 10 * PX);
	ctx.fillStyle = "#ffffff";
	ctx.fillText(ch.label, textX, textY);
}

// ── Room layout map ─────────────────────────────────────
// Room zones:
//   Main workspace: cols 0-16, rows 0-13 (17 wide, 14 tall)
//   Separator wall: col 17, rows 0-13
//   Break room:     cols 18-27, rows 0-6 (10 wide, 7 tall)
//   Horiz wall:     cols 18-27, row 7
//   Manager office: cols 18-27, rows 8-13 (10 wide, 6 tall)

type TileType = "wood" | "cream" | "teal" | "wallTop" | "wallV" | "wallH" | "doorH" | "doorV";

function getTile(tx: number, ty: number): TileType {
	// Vertical separator at col 17
	if (tx === 17) {
		if (ty === 6 || ty === 7) return "doorV"; // door between main & right rooms
		return "wallV";
	}

	// Horizontal separator at row 7, cols 18-27
	if (ty === 7 && tx >= 18) {
		if (tx === 22 || tx === 23) return "doorH"; // door between break & manager
		return "wallH";
	}

	// Top wall row (row 0) for all rooms
	if (ty === 0) {
		return "wallTop";
	}

	// Break room: cols 18-27, rows 0-6
	if (tx >= 18 && ty <= 6) return "cream";

	// Manager office: cols 18-27, rows 8-13
	if (tx >= 18 && ty >= 8) return "teal";

	// Main workspace: cols 0-16
	if (tx <= 16) {
		if (ty === 0) return "wallTop";
		return "wood";
	}

	return "wood";
}

// ── Main draw function ──────────────────────────────────
function draw(ctx: CanvasRenderingContext2D, time: number) {
	const w = COLS * 16;
	const h = ROWS * 16;
	ctx.clearRect(0, 0, w * PX, h * PX);

	// ── 1) Floors & walls ──
	for (let ty = 0; ty < ROWS; ty++) {
		for (let tx = 0; tx < COLS; tx++) {
			const tile = getTile(tx, ty);
			switch (tile) {
				case "wood":
					drawWoodFloor(ctx, tx, ty);
					break;
				case "cream":
					drawCreamFloor(ctx, tx, ty);
					break;
				case "teal":
					drawTealCarpet(ctx, tx, ty);
					break;
				case "wallTop":
					drawWallTop(ctx, tx, ty);
					break;
				case "wallV":
					drawVertWall(ctx, tx, ty);
					break;
				case "wallH":
					drawHorizWall(ctx, tx, ty);
					break;
				case "doorH":
					drawDoorH(ctx, tx, ty, tx >= 18 ? drawTealCarpet : drawWoodFloor);
					break;
				case "doorV":
					drawDoorV(ctx, tx, ty, drawWoodFloor);
					break;
			}
		}
	}

	// ── 2) Furniture ──

	// Main workspace — 6 desks in 3 rows of 2
	drawDesk(ctx, 2, 2, true);
	drawChair(ctx, 2, 4);
	drawDesk(ctx, 5, 2, true);
	drawChair(ctx, 5, 4);

	drawDesk(ctx, 9, 2, true);
	drawChair(ctx, 9, 4);
	drawDesk(ctx, 12, 2, true);
	drawChair(ctx, 12, 4);

	drawDesk(ctx, 2, 7, true);
	drawChair(ctx, 2, 9);
	drawDesk(ctx, 5, 7, true);
	drawChair(ctx, 5, 9);

	// Bookshelves along bottom wall of main workspace
	drawBookshelf(ctx, 1, 12);
	drawBookshelf(ctx, 3, 12);
	drawBookshelf(ctx, 14, 12);
	drawBookshelf(ctx, 16, 12);

	// Break room — water cooler + table
	drawWaterCooler(ctx, 25, 1);
	drawBreakTable(ctx, 20, 2);
	drawBreakTable(ctx, 22, 2);

	// Manager office — large desk + painting + lamp
	drawManagerDesk(ctx, 21, 9);
	drawManagerDesk(ctx, 23, 9);
	drawPainting(ctx, 26, 8);
	drawFloorLamp(ctx, 18, 9);

	// ── 3) Characters ──
	const animFrame = Math.floor(time / 500) % 2;

	const characters: Character[] = [
		{
			x: 3,
			y: 4,
			skin: C.skin1,
			hair: C.hair1,
			shirt: C.shirt1,
			dir: 1,
			frame: animFrame,
			label: "Dev A",
		},
		{
			x: 10,
			y: 4,
			skin: C.skin2,
			hair: C.hair2,
			shirt: C.shirt2,
			dir: 1,
			frame: animFrame + 1,
			label: "Dev B",
		},
		{
			x: 6,
			y: 9,
			skin: C.skin3,
			hair: C.hair3,
			shirt: C.shirt3,
			dir: 0,
			frame: animFrame,
			label: "Dev C",
		},
		{
			x: 21,
			y: 4,
			skin: C.skin1,
			hair: C.hair4,
			shirt: C.shirt4,
			dir: 2,
			frame: animFrame + 1,
			label: "Designer",
		},
		{
			x: 22,
			y: 11,
			skin: C.skin2,
			hair: C.hair5,
			shirt: C.shirt5,
			dir: 1,
			frame: animFrame,
			label: "Manager",
		},
	];

	// Sort by y for painter's algo
	characters.sort((a, b) => a.y - b.y);
	for (const ch of characters) {
		drawCharacter(ctx, ch, time);
	}
}

// ── Component ───────────────────────────────────────────
function PixelOfficeV8() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rafRef = useRef<number>(0);

	const render = useCallback(() => {
		const cvs = canvasRef.current;
		if (!cvs) return;
		const ctx = cvs.getContext("2d");
		if (!ctx) return;
		ctx.imageSmoothingEnabled = false;
		draw(ctx, performance.now());
		rafRef.current = requestAnimationFrame(render);
	}, []);

	useEffect(() => {
		rafRef.current = requestAnimationFrame(render);
		return () => cancelAnimationFrame(rafRef.current);
	}, [render]);

	return (
		<div
			style={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				minHeight: "100vh",
				background: "#111118",
			}}
		>
			<div>
				<h2
					style={{
						color: "#ccc",
						fontFamily: "monospace",
						textAlign: "center",
						marginBottom: 12,
						fontSize: 14,
					}}
				>
					v8 — Multi-Room Office (28×14, 3× zoom)
				</h2>
				<canvas
					ref={canvasRef}
					width={COLS * 16 * PX}
					height={ROWS * 16 * PX}
					style={{
						imageRendering: "pixelated",
						border: "2px solid #333",
						borderRadius: 4,
						display: "block",
					}}
				/>
				<p
					style={{
						color: "#666",
						fontFamily: "monospace",
						textAlign: "center",
						marginTop: 8,
						fontSize: 11,
					}}
				>
					Main Workspace • Break Room • Manager Office
				</p>
			</div>
		</div>
	);
}
