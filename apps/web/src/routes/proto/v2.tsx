import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef } from "react";

export const Route = createFileRoute("/proto/v2")({
	component: BreakRoomOffice,
});

// ─── CONFIG ──────────────────────────────────────────
const TILE = 16;
const COLS = 24;
const ROWS = 14;
const ZOOM = 3;
const W = COLS * TILE;
const H = ROWS * TILE;

// ─── COLORS ──────────────────────────────────────────
const C = {
	void: "#1e1e2e",
	wall: "#2a2a3d",
	wallTop: "#3a3a5d",
	wallLine: "#4a4a6a",
	// Main workspace floor (warm wood)
	floorA: "#8B6914",
	floorB: "#A07828",
	floorC: "#B8922E",
	floorD: "#6B4E0A",
	// Break room floor (lighter, cooler)
	breakA: "#A89070",
	breakB: "#B8A080",
	breakC: "#C8B090",
	breakD: "#907858",
	// Furniture
	deskA: "#8B6914",
	deskB: "#A07828",
	deskC: "#6B4E0A",
	monFrame: "#555566",
	monScreen: "#334455",
	monGlow: "#55aacc",
	// Books
	bookR: "#CC4444",
	bookB: "#4477AA",
	bookG: "#44AA66",
	bookY: "#CCAA33",
	bookP: "#9955AA",
	// Plant
	leafA: "#3D8B37",
	leafB: "#2D6B27",
	pot: "#B85C3A",
	potRim: "#8B4422",
	// Shelf
	shelfWood: "#5A4010",
	shelfBack: "#3a3a4d",
	// Couch
	couchA: "#884444",
	couchB: "#773333",
	couchC: "#662222",
	// Coffee table
	tableA: "#7A5A14",
	tableB: "#6A4A0A",
};

// ─── SPRITE TYPES ────────────────────────────────────
type Sprite = string[][];

interface FurnitureItem {
	type: string;
	tx: number;
	ty: number;
	sprite: Sprite;
	w: number;
	h: number;
	sortY: number;
}

interface CharDef {
	name: string;
	skin: string;
	hair: string;
	shirt: string;
	pants: string;
	status: string;
	statusColor: string;
}

interface Character {
	name: string;
	status: string;
	statusColor: string;
	x: number;
	y: number;
	tx: number;
	ty: number;
	state: "IDLE" | "WALK" | "TYPE";
	dir: string;
	base: Sprite;
	typeFrames: Sprite[];
	walkFrames: Sprite[];
	frame: number;
	frameTime: number;
	path: Array<{ x: number; y: number }> | null;
	pathIdx: number;
	deskTx: number;
	deskTy: number;
	walkTimer: number;
	nextWalkTime: number;
	spawnEffect: number;
	spawnCols: number[];
	selected: boolean;
}

// ─── BREAK ROOM MAP ──────────────────────────────────
// 0 = main floor, 1 = wall, 2 = break room floor
function buildMap(): number[][] {
	const map: number[][] = [];
	for (let r = 0; r < ROWS; r++) {
		map[r] = [];
		for (let c = 0; c < COLS; c++) {
			if (r < 2) {
				map[r][c] = 1; // wall
			} else if (c >= 17 && r <= 8) {
				map[r][c] = 2; // break room
			} else {
				map[r][c] = 0; // main floor
			}
		}
	}
	return map;
}

function buildWalkable(map: number[][]): boolean[][] {
	const w: boolean[][] = [];
	for (let r = 0; r < ROWS; r++) {
		w[r] = [];
		for (let c = 0; c < COLS; c++) {
			w[r][c] = map[r][c] !== 1;
		}
	}
	return w;
}

// ─── SPRITE GENERATORS ──────────────────────────────
function makeFloor(seed: number, isBreakRoom: boolean): Sprite {
	const s: Sprite = [];
	const fA = isBreakRoom ? C.breakA : C.floorA;
	const fB = isBreakRoom ? C.breakB : C.floorB;
	const fC = isBreakRoom ? C.breakC : C.floorC;
	const fD = isBreakRoom ? C.breakD : C.floorD;
	for (let r = 0; r < 16; r++) {
		const row: string[] = [];
		for (let c = 0; c < 16; c++) {
			const h = (seed * 7 + r * 13 + c * 31) & 0xff;
			if (r === 0 || c === 0) row.push(fD);
			else if (h % 7 === 0) row.push(fA);
			else if (h % 5 === 0) row.push(fB);
			else row.push(fC);
		}
		s.push(row);
	}
	return s;
}

function makeWallSprite(): Sprite {
	const s: Sprite = [];
	for (let r = 0; r < 16; r++) {
		const row: string[] = [];
		for (let c = 0; c < 16; c++) {
			if (r < 2) row.push(C.wallTop);
			else if (r === 2) row.push(C.wallLine);
			else row.push(C.wall);
		}
		s.push(row);
	}
	return s;
}

function makeDesk(): Sprite {
	const s: Sprite = [];
	for (let r = 0; r < 32; r++) {
		const row: string[] = [];
		for (let c = 0; c < 32; c++) {
			if (r < 2) row.push(C.deskC);
			else if (r < 4) row.push(C.deskA);
			else if (r < 14) {
				if (c < 2 || c > 29) row.push(C.deskC);
				else row.push(C.deskB);
			} else if (r < 16) row.push(C.deskA);
			else if (r < 18) {
				if (c < 2 || c > 29) row.push(C.deskC);
				else row.push("");
			} else if (r < 30) {
				if ((c >= 2 && c <= 4) || (c >= 27 && c <= 29)) row.push(C.deskA);
				else row.push("");
			} else {
				if ((c >= 1 && c <= 5) || (c >= 26 && c <= 30)) row.push(C.deskC);
				else row.push("");
			}
		}
		s.push(row);
	}
	return s;
}

function makeMonitor(glowing: boolean): Sprite {
	const s: Sprite = [];
	const sc = glowing ? "#2a4455" : C.monScreen;
	const gl = glowing ? C.monGlow : "#445566";
	for (let r = 0; r < 16; r++) {
		const row: string[] = [];
		for (let c = 0; c < 16; c++) {
			if (r < 1) row.push(c >= 4 && c <= 11 ? C.monFrame : "");
			else if (r < 2) row.push(c >= 3 && c <= 12 ? C.monFrame : "");
			else if (r < 10) {
				if (c === 3 || c === 12) row.push(C.monFrame);
				else if (c > 3 && c < 12) {
					if (glowing && r % 2 === 0 && c > 4 && c < 11) row.push(gl);
					else row.push(sc);
				} else row.push("");
			} else if (r === 10) row.push(c >= 3 && c <= 12 ? C.monFrame : "");
			else if (r === 11) row.push(c >= 6 && c <= 9 ? "#666677" : "");
			else if (r === 12) row.push(c >= 5 && c <= 10 ? "#555566" : "");
			else row.push("");
		}
		s.push(row);
	}
	return s;
}

function makeKeyboard(): Sprite {
	const s: Sprite = [];
	for (let r = 0; r < 6; r++) {
		const row: string[] = [];
		for (let c = 0; c < 16; c++) {
			if (r === 0) row.push(c >= 3 && c <= 12 ? "#444455" : "");
			else if (r < 5) {
				if (c >= 2 && c <= 13) {
					if (r > 0 && r < 5 && c > 2 && c < 13 && (c + r) % 2 === 0) row.push("#555566");
					else row.push("#3a3a4d");
				} else row.push("");
			} else row.push(c >= 3 && c <= 12 ? "#333344" : "");
		}
		s.push(row);
	}
	return s;
}

function makeBookshelf(variant: number): Sprite {
	const s: Sprite = [];
	const bookColors = [
		[C.bookR, C.bookB, C.bookG, C.bookY, C.bookP, C.bookR, C.bookB],
		[C.bookG, C.bookP, C.bookY, C.bookR, C.bookB, C.bookG, C.bookY],
		[C.bookB, C.bookY, C.bookR, C.bookP, C.bookG, C.bookB, C.bookR],
	][variant % 3]!;
	for (let r = 0; r < 32; r++) {
		const row: string[] = [];
		for (let c = 0; c < 16; c++) {
			if (c === 0 || c === 15) row.push(C.shelfWood);
			else if (r === 0 || r === 31) row.push(C.shelfWood);
			else if (r === 10 || r === 11 || r === 20 || r === 21) row.push(C.shelfWood);
			else {
				const section = r < 10 ? 0 : r < 20 ? 1 : 2;
				const localR = r < 10 ? r : r < 20 ? r - 11 : r - 21;
				const bi = (c - 1) % bookColors.length;
				const bCol = bookColors[(bi + section) % bookColors.length]!;
				if (localR < 2) row.push(C.shelfBack);
				else row.push(bCol);
			}
		}
		s.push(row);
	}
	return s;
}

function makePlant(variant: number): Sprite {
	const s: Sprite = [];
	const lA = C.leafA;
	const lB = C.leafB;
	for (let r = 0; r < 24; r++) {
		const row: string[] = [];
		for (let c = 0; c < 16; c++) {
			if (r < 3) {
				const leafy =
					variant === 0
						? (r === 0 && c >= 5 && c <= 10) ||
							(r === 1 && c >= 4 && c <= 11) ||
							(r === 2 && c >= 3 && c <= 12)
						: (r === 0 && c >= 6 && c <= 9) ||
							(r === 1 && c >= 4 && c <= 11) ||
							(r === 2 && c >= 3 && c <= 12);
				row.push(leafy ? ((c + r) % 3 === 0 ? lB : lA) : "");
			} else if (r < 8) {
				const leafy = c >= 2 && c <= 13 && !((c === 2 || c === 13) && r > 6);
				row.push(leafy ? ((c + r) % 3 === 0 ? lB : lA) : "");
			} else if (r < 11) {
				const leafy = c >= 3 && c <= 12;
				row.push(leafy ? ((c + r) % 4 === 0 ? lB : lA) : "");
			} else if (r < 13) row.push(c >= 7 && c <= 8 ? "#5a7a44" : "");
			else if (r === 13) row.push(c >= 5 && c <= 10 ? C.potRim : "");
			else if (r < 22) row.push(c >= 5 && c <= 10 ? C.pot : "");
			else if (r === 22) row.push(c >= 6 && c <= 9 ? C.potRim : "");
			else row.push("");
		}
		s.push(row);
	}
	return s;
}

function makeChair(dir: "up" | "down"): Sprite {
	const s: Sprite = [];
	for (let r = 0; r < 16; r++) {
		const row: string[] = [];
		for (let c = 0; c < 16; c++) {
			if (dir === "up") {
				if (r >= 2 && r <= 9 && c >= 3 && c <= 12) row.push("#664422");
				else if (r >= 10 && r <= 12 && c >= 4 && c <= 11) row.push("#553318");
				else if (r >= 13 && ((c >= 3 && c <= 4) || (c >= 11 && c <= 12))) row.push("#553318");
				else row.push("");
			} else {
				if (r >= 0 && r <= 3 && c >= 4 && c <= 11) row.push("#664422");
				else if (r >= 4 && r <= 10 && c >= 3 && c <= 12) row.push("#553318");
				else if (r >= 11 && ((c >= 3 && c <= 4) || (c >= 11 && c <= 12))) row.push("#553318");
				else row.push("");
			}
		}
		s.push(row);
	}
	return s;
}

function makeCooler(): Sprite {
	const s: Sprite = [];
	for (let r = 0; r < 24; r++) {
		const row: string[] = [];
		for (let c = 0; c < 16; c++) {
			if (r < 3) row.push(c >= 5 && c <= 10 ? "#aabbdd" : "");
			else if (r < 6) row.push(c >= 6 && c <= 9 ? "#6699cc" : "");
			else if (r < 8) row.push(c >= 4 && c <= 11 ? "#ccccdd" : "");
			else if (r < 18) {
				if (c >= 4 && c <= 11) {
					if (c === 4 || c === 11) row.push("#999aaa");
					else row.push("#bbbbcc");
				} else row.push("");
			} else if (r < 20) row.push(c >= 5 && c <= 10 ? "#888899" : "");
			else {
				if ((c >= 4 && c <= 5) || (c >= 10 && c <= 11)) row.push("#666677");
				else row.push("");
			}
		}
		s.push(row);
	}
	return s;
}

function makeCouch(): Sprite {
	const s: Sprite = [];
	// 32x20 couch (2 tiles wide, ~1.25 tiles tall)
	for (let r = 0; r < 20; r++) {
		const row: string[] = [];
		for (let c = 0; c < 32; c++) {
			// Backrest (top)
			if (r < 4) {
				if (c >= 1 && c <= 30) row.push(C.couchB);
				else row.push("");
			}
			// Cushions
			else if (r < 12) {
				if (c === 0 || c === 31)
					row.push(C.couchC); // arms
				else if (c === 1 || c === 30) row.push(C.couchB);
				else if (c === 15 || c === 16)
					row.push(C.couchB); // center seam
				else row.push(C.couchA);
			}
			// Seat front
			else if (r < 16) {
				if (c >= 1 && c <= 30) row.push(C.couchC);
				else row.push("");
			}
			// Legs
			else {
				if ((c >= 2 && c <= 4) || (c >= 27 && c <= 29)) row.push("#442222");
				else row.push("");
			}
		}
		s.push(row);
	}
	return s;
}

function makeCoffeeTable(): Sprite {
	const s: Sprite = [];
	// 24x12 small table
	for (let r = 0; r < 12; r++) {
		const row: string[] = [];
		for (let c = 0; c < 24; c++) {
			if (r < 2) {
				if (c >= 1 && c <= 22) row.push(C.tableB);
				else row.push("");
			} else if (r < 5) {
				if (c >= 0 && c <= 23) row.push(C.tableA);
				else row.push("");
			} else if (r < 7) {
				if (c >= 1 && c <= 22) row.push(C.tableB);
				else row.push("");
			} else {
				if ((c >= 2 && c <= 3) || (c >= 20 && c <= 21)) row.push(C.tableB);
				else row.push("");
			}
		}
		s.push(row);
	}
	return s;
}

// ─── CHARACTER BUILDER ───────────────────────────────
function makeCharBody(skin: string, hair: string, shirt: string, pants: string): Sprite {
	const s: Sprite = [];
	for (let r = 0; r < 24; r++) {
		const row: string[] = [];
		for (let c = 0; c < 16; c++) {
			if (r < 3) row.push(c >= 5 && c <= 10 ? hair : "");
			else if (r < 5) row.push(c >= 4 && c <= 11 ? hair : "");
			else if (r < 9) {
				if (c >= 5 && c <= 10) {
					if (r === 6 && (c === 6 || c === 9)) row.push("#222233");
					else if (r === 8 && c >= 7 && c <= 8) row.push("#cc8877");
					else row.push(skin);
				} else if (c === 4 || c === 11) row.push(r < 7 ? hair : "");
				else row.push("");
			} else if (r === 9) row.push(c >= 7 && c <= 8 ? skin : "");
			else if (r < 16) row.push(c >= 4 && c <= 11 ? shirt : "");
			else if (r < 18) row.push(c >= 4 && c <= 11 ? shirt : "");
			else if (r === 18) {
				if ((c >= 3 && c <= 4) || (c >= 11 && c <= 12)) row.push(skin);
				else if (c >= 5 && c <= 10) row.push(pants);
				else row.push("");
			} else if (r < 22) row.push(c >= 5 && c <= 10 ? pants : "");
			else if (r >= 22) {
				if ((c >= 4 && c <= 6) || (c >= 9 && c <= 11)) row.push("#333344");
				else row.push("");
			}
		}
		s.push(row);
	}
	return s;
}

function makeTypeFrame(base: Sprite, frame: number): Sprite {
	const s = base.map((r) => [...r]);
	if (frame === 1 && s[17] && s[16] && s[18]) {
		s[17][11] = "";
		s[16][12] = s[18][11] || "#ddbb99";
	}
	return s;
}

function makeWalkFrame(base: Sprite, frame: number): Sprite {
	const s = base.map((r) => [...r]);
	if (frame === 0 || frame === 2) return s;
	if (frame === 1 && s[22]) {
		s[22][4] = "";
		s[22][5] = "";
		s[22][6] = "";
		s[22][3] = "#333344";
		s[22][4] = "#333344";
		s[22][5] = "#333344";
	}
	if (frame === 3 && s[22]) {
		s[22][9] = "";
		s[22][10] = "";
		s[22][11] = "";
		s[22][10] = "#333344";
		s[22][11] = "#333344";
		s[22][12] = "#333344";
	}
	return s;
}

// ─── BFS PATHFINDING ─────────────────────────────────
function bfs(
	walkable: boolean[][],
	sx: number,
	sy: number,
	ex: number,
	ey: number,
): Array<{ x: number; y: number }> | null {
	if (sx === ex && sy === ey) return [];
	if (!walkable[ey]?.[ex]) return null;
	const visited: boolean[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
	const prev: Array<Array<[number, number] | null>> = Array.from({ length: ROWS }, () =>
		Array(COLS).fill(null),
	);
	const q: Array<[number, number]> = [[sx, sy]];
	visited[sy]![sx] = true;
	const dirs = [
		[0, -1],
		[0, 1],
		[-1, 0],
		[1, 0],
	];
	while (q.length) {
		const [cx, cy] = q.shift()!;
		for (const [dx, dy] of dirs) {
			const nx = cx + dx!;
			const ny = cy + dy!;
			if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !visited[ny]![nx] && walkable[ny]![nx]) {
				visited[ny]![nx] = true;
				prev[ny]![nx] = [cx, cy];
				if (nx === ex && ny === ey) {
					const path: Array<{ x: number; y: number }> = [];
					let px = ex;
					let py = ey;
					while (px !== sx || py !== sy) {
						path.unshift({ x: px, y: py });
						[px, py] = prev[py]![px]!;
					}
					return path;
				}
				q.push([nx, ny]);
			}
		}
	}
	return null;
}

// ─── CHARACTER DEFS ──────────────────────────────────
const CHAR_DEFS: CharDef[] = [
	{
		name: "Alice",
		skin: "#E8B88A",
		hair: "#8B4513",
		shirt: "#CC4444",
		pants: "#334466",
		status: "Building REST API",
		statusColor: "#4499ff",
	},
	{
		name: "Bob",
		skin: "#D2956A",
		hair: "#1a1a2e",
		shirt: "#4477AA",
		pants: "#333344",
		status: "Debugging CSS layout",
		statusColor: "#ccaa33",
	},
	{
		name: "Carol",
		skin: "#F5D0A9",
		hair: "#CC8833",
		shirt: "#44AA66",
		pants: "#3a3a4d",
		status: "Writing unit tests",
		statusColor: "#4499ff",
	},
	{
		name: "Dave",
		skin: "#C68642",
		hair: "#2a1a0e",
		shirt: "#AA44AA",
		pants: "#2d2d3d",
		status: "On break",
		statusColor: "#55cc88",
	},
];

// ─── COMPONENT ───────────────────────────────────────
function BreakRoomOffice() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const stateRef = useRef<{
		map: number[][];
		walkable: boolean[][];
		furniture: FurnitureItem[];
		floorTiles: Array<{ tx: number; ty: number; sprite: Sprite }>;
		characters: Character[];
		wallSprite: Sprite;
		lastTime: number;
	} | null>(null);

	const initState = useCallback(() => {
		const map = buildMap();
		const walkable = buildWalkable(map);
		const furniture: FurnitureItem[] = [];
		const floorTiles: Array<{ tx: number; ty: number; sprite: Sprite }> = [];
		const wallSprite = makeWallSprite();
		const DESK_SPRITE = makeDesk();
		const KEYBOARD = makeKeyboard();
		const COOLER = makeCooler();
		const COUCH = makeCouch();
		const COFFEE_TABLE = makeCoffeeTable();

		// Floor tiles
		for (let r = 0; r < ROWS; r++)
			for (let c = 0; c < COLS; c++)
				if (map[r]![c] !== 1)
					floorTiles.push({
						tx: c,
						ty: r,
						sprite: makeFloor(r * COLS + c, map[r]![c] === 2),
					});

		// Break room divider line — thin wall strip at col 16, rows 2-8
		for (let r = 2; r <= 8; r++) {
			if (r === 4 || r === 5) continue; // doorway
			walkable[r]![16] = false;
		}

		// Bookshelves along left wall
		[0, 2, 4, 6].forEach((tx, i) => {
			furniture.push({
				type: "shelf",
				tx,
				ty: 1,
				sprite: makeBookshelf(i),
				w: 1,
				h: 2,
				sortY: 3 * TILE,
			});
			walkable[2]![tx] = false;
		});

		// Bookshelves along break room wall
		[18, 20].forEach((tx, i) => {
			furniture.push({
				type: "shelf",
				tx,
				ty: 1,
				sprite: makeBookshelf(i + 4),
				w: 1,
				h: 2,
				sortY: 3 * TILE,
			});
			walkable[2]![tx] = false;
		});

		// Main workspace desks — 3 rows of 2
		const deskPositions = [
			{ tx: 1, ty: 4 },
			{ tx: 5, ty: 4 },
			{ tx: 9, ty: 4 },
			{ tx: 1, ty: 8 },
			{ tx: 5, ty: 8 },
			{ tx: 9, ty: 8 },
		];
		deskPositions.forEach((d, i) => {
			furniture.push({
				type: "desk",
				tx: d.tx,
				ty: d.ty,
				sprite: DESK_SPRITE,
				w: 2,
				h: 2,
				sortY: (d.ty + 2) * TILE,
			});
			walkable[d.ty]![d.tx] = false;
			walkable[d.ty]![d.tx + 1] = false;
			walkable[d.ty + 1]![d.tx] = false;
			walkable[d.ty + 1]![d.tx + 1] = false;
			furniture.push({
				type: "monitor",
				tx: d.tx,
				ty: d.ty - 0.5,
				sprite: makeMonitor(i < 3),
				w: 1,
				h: 1,
				sortY: d.ty * TILE - 2,
			});
			furniture.push({
				type: "monitor",
				tx: d.tx + 1,
				ty: d.ty - 0.5,
				sprite: makeMonitor(i >= 3),
				w: 1,
				h: 1,
				sortY: d.ty * TILE - 2,
			});
			furniture.push({
				type: "kbd",
				tx: d.tx + 0.2,
				ty: d.ty + 0.6,
				sprite: KEYBOARD,
				w: 1,
				h: 0.5,
				sortY: (d.ty + 1) * TILE,
			});
			const chairY = d.ty + 2;
			if (chairY < ROWS) {
				furniture.push({
					type: "chair",
					tx: d.tx + 0.5,
					ty: chairY,
					sprite: makeChair("up"),
					w: 1,
					h: 1,
					sortY: (chairY + 1) * TILE,
				});
				walkable[chairY]![d.tx] = false;
				walkable[chairY]![d.tx + 1] = false;
			}
		});

		// Break room furniture
		// Couch (top area of break room)
		furniture.push({
			type: "couch",
			tx: 18,
			ty: 3,
			sprite: COUCH,
			w: 2,
			h: 1.25,
			sortY: 5 * TILE,
		});
		walkable[3]![18] = false;
		walkable[3]![19] = false;
		walkable[4]![18] = false;
		walkable[4]![19] = false;

		// Coffee table in front of couch
		furniture.push({
			type: "table",
			tx: 18.25,
			ty: 5.2,
			sprite: COFFEE_TABLE,
			w: 1.5,
			h: 0.75,
			sortY: 6.5 * TILE,
		});
		walkable[5]![18] = false;
		walkable[5]![19] = false;

		// Water cooler in break room
		furniture.push({
			type: "cooler",
			tx: 22,
			ty: 3,
			sprite: COOLER,
			w: 1,
			h: 1.5,
			sortY: 5 * TILE,
		});
		walkable[3]![22] = false;
		walkable[4]![22] = false;

		// Plants
		[
			{ tx: 14, ty: 3 },
			{ tx: 0, ty: 11 },
			{ tx: 23, ty: 7 },
			{ tx: 13, ty: 11 },
		].forEach((p, i) => {
			furniture.push({
				type: "plant",
				tx: p.tx,
				ty: p.ty,
				sprite: makePlant(i % 2),
				w: 1,
				h: 1.5,
				sortY: (p.ty + 1.5) * TILE,
			});
			walkable[p.ty]![p.tx] = false;
			if (p.ty + 1 < ROWS) walkable[p.ty + 1]![p.tx] = false;
		});

		// Characters
		const characters: Character[] = CHAR_DEFS.map((def, i) => {
			const base = makeCharBody(def.skin, def.hair, def.shirt, def.pants);
			const typeFrames = [base, makeTypeFrame(base, 1)];
			const walkFrames = [base, makeWalkFrame(base, 1), base, makeWalkFrame(base, 3)];

			// First 3 at desks, 4th in break room
			let seatX: number, seatY: number;
			if (i < 3) {
				const desk = deskPositions[i]!;
				seatX = desk.tx;
				seatY = desk.ty + 2;
			} else {
				// Dave hangs out near the couch
				seatX = 20;
				seatY = 6;
			}

			return {
				name: def.name,
				status: def.status,
				statusColor: def.statusColor,
				x: seatX * TILE,
				y: seatY * TILE,
				tx: seatX,
				ty: seatY,
				state: i < 3 ? ("TYPE" as const) : ("IDLE" as const),
				dir: "up",
				base,
				typeFrames,
				walkFrames,
				frame: 0,
				frameTime: 0,
				path: null,
				pathIdx: 0,
				deskTx: i < 3 ? deskPositions[i]!.tx : 20,
				deskTy: i < 3 ? deskPositions[i]!.ty + 2 : 6,
				walkTimer: i < 3 ? 0 : 2,
				nextWalkTime: 5 + Math.random() * 10,
				spawnEffect: 0.3,
				spawnCols: Array.from({ length: 16 }, () => Math.random() * 0.2),
				selected: false,
			};
		});

		return {
			map,
			walkable,
			furniture,
			floorTiles,
			characters,
			wallSprite,
			lastTime: 0,
		};
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		canvas.width = W;
		canvas.height = H;
		ctx.imageSmoothingEnabled = false;

		stateRef.current = initState();
		const state = stateRef.current;

		function drawSprite(sprite: Sprite, x: number, y: number) {
			for (let r = 0; r < sprite.length; r++)
				for (let c = 0; c < sprite[r]!.length; c++)
					if (sprite[r]![c]) {
						ctx!.fillStyle = sprite[r]![c]!;
						ctx!.fillRect(x + c, y + r, 1, 1);
					}
		}

		function drawSpawnEffect(ch: Character, x: number, y: number) {
			const progress = 1 - ch.spawnEffect / 0.3;
			for (let c = 0; c < 16; c++) {
				const colProgress = Math.max(0, Math.min(1, (progress - ch.spawnCols[c]!) / 0.6));
				const headRow = Math.floor(colProgress * 24);
				for (let r = 0; r < 24; r++) {
					if (r <= headRow) {
						const dist = headRow - r;
						if (dist === 0) {
							ctx!.fillStyle = "#ccffcc";
							ctx!.fillRect(x + c, y + r, 1, 1);
						} else if (dist < 4) {
							ctx!.fillStyle = `rgba(0,255,65,${1 - dist / 4})`;
							ctx!.fillRect(x + c, y + r, 1, 1);
						}
					}
				}
			}
		}

		function drawDivider() {
			// Vertical divider between main and break room
			for (let r = 2; r <= 8; r++) {
				if (r === 4 || r === 5) continue; // doorway
				const x = 16 * TILE;
				const y = r * TILE;
				for (let py = 0; py < TILE; py++) {
					ctx!.fillStyle = py < 2 ? C.wallLine : C.wall;
					ctx!.fillRect(x, y + py, TILE, 1);
				}
			}
			// Doorway arch
			const dx = 16 * TILE;
			ctx!.fillStyle = C.wallLine;
			ctx!.fillRect(dx, 4 * TILE, TILE, 1);
			ctx!.fillRect(dx, 6 * TILE - 1, TILE, 1);
		}

		function update(dt: number) {
			state.characters.forEach((ch) => {
				if (ch.spawnEffect > 0) {
					ch.spawnEffect -= dt;
					if (ch.spawnEffect <= 0) ch.spawnEffect = 0;
					return;
				}

				ch.nextWalkTime -= dt;
				if (ch.nextWalkTime <= 0 && ch.state !== "WALK") {
					const targets: Array<{ x: number; y: number }> = [];
					for (let r = 2; r < ROWS; r++)
						for (let c = 0; c < COLS; c++) if (state.walkable[r]![c]) targets.push({ x: c, y: r });
					if (targets.length) {
						const t = targets[Math.floor(Math.random() * targets.length)]!;
						const path = bfs(state.walkable, ch.tx, ch.ty, t.x, t.y);
						if (path && path.length > 0 && path.length < 20) {
							ch.path = path;
							ch.pathIdx = 0;
							ch.state = "WALK";
							ch.frame = 0;
							ch.walkTimer = 0;
						}
					}
					ch.nextWalkTime = 8 + Math.random() * 15;
				}

				if (ch.state === "WALK" && ch.path) {
					ch.frameTime += dt;
					if (ch.frameTime >= 0.15) {
						ch.frame = (ch.frame + 1) % 4;
						ch.frameTime = 0;
					}
					const target = ch.path[ch.pathIdx]!;
					const tx = target.x * TILE;
					const ty = target.y * TILE;
					const speed = 48;
					const dx = tx - ch.x;
					const dy = ty - ch.y;
					const dist = Math.sqrt(dx * dx + dy * dy);
					if (dist < speed * dt) {
						ch.x = tx;
						ch.y = ty;
						ch.tx = target.x;
						ch.ty = target.y;
						ch.pathIdx++;
						if (ch.pathIdx >= ch.path.length) {
							ch.path = null;
							ch.state = "IDLE";
							ch.walkTimer = 2 + Math.random() * 3;
						}
					} else {
						ch.x += (dx / dist) * speed * dt;
						ch.y += (dy / dist) * speed * dt;
						if (Math.abs(dx) > Math.abs(dy)) ch.dir = dx > 0 ? "right" : "left";
						else ch.dir = dy > 0 ? "down" : "up";
					}
				}

				if (ch.state === "IDLE") {
					ch.walkTimer -= dt;
					if (ch.walkTimer <= 0) {
						const path = bfs(state.walkable, ch.tx, ch.ty, ch.deskTx, ch.deskTy);
						if (path && path.length > 0) {
							ch.path = path;
							ch.pathIdx = 0;
							ch.state = "WALK";
							ch.frame = 0;
						} else {
							ch.state = "TYPE";
							ch.frame = 0;
						}
						ch.walkTimer = 0;
					}
				}

				if (
					ch.state !== "WALK" &&
					ch.tx === ch.deskTx &&
					ch.ty === ch.deskTy &&
					ch.walkTimer <= 0
				) {
					ch.state = "TYPE";
					ch.dir = "up";
				}

				if (ch.state === "TYPE") {
					ch.frameTime += dt;
					if (ch.frameTime >= 0.3) {
						ch.frame = (ch.frame + 1) % 2;
						ch.frameTime = 0;
					}
				}
			});
		}

		function render() {
			ctx!.imageSmoothingEnabled = false;
			ctx!.fillStyle = C.void;
			ctx!.fillRect(0, 0, W, H);

			// Walls
			for (let c = 0; c < COLS; c++)
				for (let r = 0; r < 2; r++) drawSprite(state.wallSprite, c * TILE, r * TILE);

			// Floor
			state.floorTiles.forEach((f) => drawSprite(f.sprite, f.tx * TILE, f.ty * TILE));

			// Divider
			drawDivider();

			// Z-sorted items
			const renderItems: Array<{ sortY: number; draw: () => void }> = [];

			state.furniture.forEach((f) => {
				renderItems.push({
					sortY: f.sortY,
					draw: () => drawSprite(f.sprite, f.tx * TILE, f.ty * TILE),
				});
			});

			state.characters.forEach((ch) => {
				const drawY = ch.y - 8;
				renderItems.push({
					sortY: ch.y + 16,
					draw: () => {
						if (ch.spawnEffect > 0) {
							drawSpawnEffect(ch, ch.x, drawY);
							return;
						}
						let sprite: Sprite;
						if (ch.state === "TYPE") sprite = ch.typeFrames[ch.frame]!;
						else if (ch.state === "WALK") sprite = ch.walkFrames[ch.frame]!;
						else sprite = ch.base;
						drawSprite(sprite, ch.x, drawY);

						// Floating label
						const labelX = ch.x + 8;
						const labelY = drawY - 6;
						ctx!.fillStyle = "rgba(30,30,46,0.75)";
						ctx!.fillRect(labelX - ch.name.length * 2 - 3, labelY - 4, ch.name.length * 4 + 10, 7);
						ctx!.fillStyle = ch.statusColor;
						ctx!.fillRect(labelX - ch.name.length * 2 - 1, labelY - 2, 2, 3);
						ctx!.fillStyle = "#c0c0d0";
						ctx!.font = "3px monospace";
						ctx!.fillText(ch.name, labelX - ch.name.length * 2 + 3, labelY + 1);

						if (ch.selected) {
							ctx!.strokeStyle = "#5ac88c";
							ctx!.lineWidth = 0.5;
							ctx!.strokeRect(ch.x - 0.5, drawY - 0.5, 17, 25);
						}
					},
				});
			});

			renderItems.sort((a, b) => a.sortY - b.sortY);
			renderItems.forEach((item) => item.draw());
		}

		let rafId: number;
		function frame(time: number) {
			const dt = state.lastTime === 0 ? 0 : Math.min((time - state.lastTime) / 1000, 0.1);
			state.lastTime = time;
			update(dt);
			render();
			rafId = requestAnimationFrame(frame);
		}
		rafId = requestAnimationFrame(frame);

		// Click handler
		function onClick(e: MouseEvent) {
			const rect = canvas!.getBoundingClientRect();
			const scaleX = W / rect.width;
			const scaleY = H / rect.height;
			const mx = (e.clientX - rect.left) * scaleX;
			const my = (e.clientY - rect.top) * scaleY;

			let clicked: Character | null = null;
			state.characters.forEach((ch) => {
				const drawY = ch.y - 8;
				if (mx >= ch.x && mx <= ch.x + 16 && my >= drawY && my <= drawY + 24) clicked = ch;
			});

			state.characters.forEach((ch) => (ch.selected = false));
			if (clicked) (clicked as Character).selected = true;
		}
		canvas.addEventListener("click", onClick);

		return () => {
			cancelAnimationFrame(rafId);
			canvas.removeEventListener("click", onClick);
		};
	}, [initState]);

	return (
		<div
			style={{
				width: "100%",
				height: "100vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "#0a0a14",
			}}
		>
			<canvas
				ref={canvasRef}
				style={{
					width: W * ZOOM,
					height: H * ZOOM,
					imageRendering: "pixelated",
					cursor: "pointer",
				}}
			/>
		</div>
	);
}
