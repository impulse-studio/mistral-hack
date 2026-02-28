import { TileType, FurnitureType, DEFAULT_COLS, DEFAULT_ROWS, TILE_SIZE, Direction } from "./types";
import type {
	TileType as TileTypeVal,
	OfficeLayout,
	PlacedFurniture,
	Seat,
	FurnitureInstance,
	FloorColor,
} from "./types";
import { getCatalogEntry } from "./furnitureCatalog";
import { getColorizedSprite } from "./colorize";

/** Convert flat tile array from layout into 2D grid */
export function layoutToTileMap(layout: OfficeLayout): TileTypeVal[][] {
	const map: TileTypeVal[][] = [];
	for (let r = 0; r < layout.rows; r++) {
		const row: TileTypeVal[] = [];
		for (let c = 0; c < layout.cols; c++) {
			row.push(layout.tiles[r * layout.cols + c]);
		}
		map.push(row);
	}
	return map;
}

/** Convert placed furniture into renderable FurnitureInstance[] */
export function layoutToFurnitureInstances(furniture: PlacedFurniture[]): FurnitureInstance[] {
	// Pre-compute desk zY per tile so surface items can sort in front of desks
	const deskZByTile = new Map<string, number>();
	for (const item of furniture) {
		const entry = getCatalogEntry(item.type);
		if (!entry || !entry.isDesk) continue;
		const deskZY = item.row * TILE_SIZE + entry.sprite.length;
		for (let dr = 0; dr < entry.footprintH; dr++) {
			for (let dc = 0; dc < entry.footprintW; dc++) {
				const key = `${item.col + dc},${item.row + dr}`;
				const prev = deskZByTile.get(key);
				if (prev === undefined || deskZY > prev) deskZByTile.set(key, deskZY);
			}
		}
	}

	const instances: FurnitureInstance[] = [];
	for (const item of furniture) {
		const entry = getCatalogEntry(item.type);
		if (!entry) continue;
		const x = item.col * TILE_SIZE;
		const y = item.row * TILE_SIZE;
		const spriteH = entry.sprite.length;
		let zY = y + spriteH;

		// Chair z-sorting: ensure characters sitting on chairs render correctly
		if (entry.category === "chairs") {
			if (entry.orientation === "back") {
				// Back-facing chairs render IN FRONT of the seated character
				// (the chair back visually occludes the character behind it)
				zY = (item.row + 1) * TILE_SIZE + 1;
			} else {
				// All other chairs: cap zY to first row bottom so characters
				// at any seat tile render in front of the chair
				zY = (item.row + 1) * TILE_SIZE;
			}
		}

		// Surface items render in front of the desk they sit on
		if (entry.canPlaceOnSurfaces) {
			for (let dr = 0; dr < entry.footprintH; dr++) {
				for (let dc = 0; dc < entry.footprintW; dc++) {
					const deskZ = deskZByTile.get(`${item.col + dc},${item.row + dr}`);
					if (deskZ !== undefined && deskZ + 0.5 > zY) zY = deskZ + 0.5;
				}
			}
		}

		// Colorize sprite if this furniture has a color override
		let sprite = entry.sprite;
		if (item.color) {
			const { h, s, b: bv, c: cv } = item.color;
			sprite = getColorizedSprite(
				`furn-${item.type}-${h}-${s}-${bv}-${cv}-${item.color.colorize ? 1 : 0}`,
				entry.sprite,
				item.color,
			);
		}

		instances.push({ sprite, x, y, zY });
	}
	return instances;
}

/** Get all tiles blocked by furniture footprints, optionally excluding a set of tiles.
 *  Skips top backgroundTiles rows so characters can walk through them. */
export function getBlockedTiles(
	furniture: PlacedFurniture[],
	excludeTiles?: Set<string>,
): Set<string> {
	const tiles = new Set<string>();
	for (const item of furniture) {
		const entry = getCatalogEntry(item.type);
		if (!entry) continue;
		const bgRows = entry.backgroundTiles || 0;
		for (let dr = 0; dr < entry.footprintH; dr++) {
			if (dr < bgRows) continue; // skip background rows — characters can walk through
			for (let dc = 0; dc < entry.footprintW; dc++) {
				const key = `${item.col + dc},${item.row + dr}`;
				if (excludeTiles && excludeTiles.has(key)) continue;
				tiles.add(key);
			}
		}
	}
	return tiles;
}

/** Get tiles blocked for placement purposes — skips top backgroundTiles rows per item */
export function getPlacementBlockedTiles(
	furniture: PlacedFurniture[],
	excludeUid?: string,
): Set<string> {
	const tiles = new Set<string>();
	for (const item of furniture) {
		if (item.uid === excludeUid) continue;
		const entry = getCatalogEntry(item.type);
		if (!entry) continue;
		const bgRows = entry.backgroundTiles || 0;
		for (let dr = 0; dr < entry.footprintH; dr++) {
			if (dr < bgRows) continue; // skip background rows
			for (let dc = 0; dc < entry.footprintW; dc++) {
				tiles.add(`${item.col + dc},${item.row + dr}`);
			}
		}
	}
	return tiles;
}

/** Map chair orientation to character facing direction */
function orientationToFacing(orientation: string): Direction {
	switch (orientation) {
		case "front":
			return Direction.DOWN;
		case "back":
			return Direction.UP;
		case "left":
			return Direction.LEFT;
		case "right":
			return Direction.RIGHT;
		default:
			return Direction.DOWN;
	}
}

/** Generate seats from chair furniture.
 *  Facing priority: 1) chair orientation, 2) adjacent desk, 3) forward (DOWN). */
export function layoutToSeats(furniture: PlacedFurniture[]): Map<string, Seat> {
	const seats = new Map<string, Seat>();

	// Build set of all desk tiles
	const deskTiles = new Set<string>();
	for (const item of furniture) {
		const entry = getCatalogEntry(item.type);
		if (!entry || !entry.isDesk) continue;
		for (let dr = 0; dr < entry.footprintH; dr++) {
			for (let dc = 0; dc < entry.footprintW; dc++) {
				deskTiles.add(`${item.col + dc},${item.row + dr}`);
			}
		}
	}

	const dirs: Array<{ dc: number; dr: number; facing: Direction }> = [
		{ dc: 0, dr: -1, facing: Direction.UP }, // desk is above chair → face UP
		{ dc: 0, dr: 1, facing: Direction.DOWN }, // desk is below chair → face DOWN
		{ dc: -1, dr: 0, facing: Direction.LEFT }, // desk is left of chair → face LEFT
		{ dc: 1, dr: 0, facing: Direction.RIGHT }, // desk is right of chair → face RIGHT
	];

	// For each chair, every footprint tile becomes a seat.
	// Multi-tile chairs (e.g. 2-tile couches) produce multiple seats.
	for (const item of furniture) {
		const entry = getCatalogEntry(item.type);
		if (!entry || entry.category !== "chairs") continue;

		let seatCount = 0;
		for (let dr = 0; dr < entry.footprintH; dr++) {
			for (let dc = 0; dc < entry.footprintW; dc++) {
				const tileCol = item.col + dc;
				const tileRow = item.row + dr;

				// Determine facing direction:
				// 1) Chair orientation takes priority
				// 2) Adjacent desk direction
				// 3) Default forward (DOWN)
				let facingDir: Direction = Direction.DOWN;
				if (entry.orientation) {
					facingDir = orientationToFacing(entry.orientation);
				} else {
					for (const d of dirs) {
						if (deskTiles.has(`${tileCol + d.dc},${tileRow + d.dr}`)) {
							facingDir = d.facing;
							break;
						}
					}
				}

				// First seat uses chair uid (backward compat), subsequent use uid:N
				const seatUid = seatCount === 0 ? item.uid : `${item.uid}:${seatCount}`;
				seats.set(seatUid, {
					uid: seatUid,
					seatCol: tileCol,
					seatRow: tileRow,
					facingDir,
					assigned: false,
				});
				seatCount++;
			}
		}
	}

	return seats;
}

/** Get the set of tiles occupied by seats (so they can be excluded from blocked tiles) */
export function getSeatTiles(seats: Map<string, Seat>): Set<string> {
	const tiles = new Set<string>();
	for (const seat of seats.values()) {
		tiles.add(`${seat.seatCol},${seat.seatRow}`);
	}
	return tiles;
}

// ── Room floor colors ────────────────────────────────────────────
const WORK_AREA_COLOR: FloorColor = { h: 200, s: 25, b: 10, c: 10 }; // teal-blue (Level 4 main floor)
const MEETING_ROOM_COLOR: FloorColor = { h: 195, s: 30, b: 15, c: 10 }; // slightly brighter teal
const LOUNGE_COLOR: FloorColor = { h: 210, s: 20, b: 5, c: 0 }; // cool blue-gray
const KITCHEN_COLOR: FloorColor = { h: 180, s: 20, b: 10, c: 0 }; // muted teal
const DOORWAY_COLOR: FloorColor = { h: 35, s: 25, b: 10, c: 0 }; // warm tan transition
const WALL_FACE_COLOR: FloorColor = { h: 30, s: 12, b: 35, c: 15 }; // cream/beige (Level 4 walls)

/**
 * Create the default office layout — 24×15 grid with 4 rooms:
 *
 *  ┌────────────────────┬──────────┐
 *  │   WORK AREA        │ MEETING  │
 *  │   4 desks (2 PC,   │  table   │
 *  │    2 laptop)       │  chairs  │
 *  │                    │  WB      │
 *  ├──────── ───────────┤── ───────┤
 *  │   LOUNGE           │ KITCHEN  │
 *  │   bookshelves       │ cooler   │
 *  │   plant, lamp      │ coffee   │
 *  └────────────────────┴──────────┘
 */
export function createDefaultLayout(): OfficeLayout {
	const COLS = DEFAULT_COLS; // 24
	const ROWS = DEFAULT_ROWS; // 15
	const W = TileType.WALL;
	const F1 = TileType.FLOOR_1; // work area
	const F2 = TileType.FLOOR_2; // meeting room
	const F3 = TileType.FLOOR_3; // lounge
	const F4 = TileType.FLOOR_4; // doorway
	const F5 = TileType.FLOOR_5; // kitchen

	const tiles: TileTypeVal[] = [];
	const tileColors: Array<FloorColor | null> = [];

	// Vertical wall at col 13, horizontal wall at row 9
	const vWall = 13;
	const hWall = 9;

	for (let r = 0; r < ROWS; r++) {
		for (let c = 0; c < COLS; c++) {
			// Outer boundary
			if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
				tiles.push(W);
				tileColors.push(WALL_FACE_COLOR);
				continue;
			}

			// Vertical divider wall at col 13
			if (c === vWall) {
				// Doorway between work area ↔ meeting: rows 5-6
				if (r >= 5 && r <= 6) {
					tiles.push(F4);
					tileColors.push(DOORWAY_COLOR);
					continue;
				}
				// Doorway between lounge ↔ kitchen: rows 11-12
				if (r >= 11 && r <= 12) {
					tiles.push(F4);
					tileColors.push(DOORWAY_COLOR);
					continue;
				}
				tiles.push(W);
				tileColors.push(WALL_FACE_COLOR);
				continue;
			}

			// Horizontal divider wall at row 9
			if (r === hWall) {
				// Doorway work area ↔ lounge: cols 5-6
				if (c >= 5 && c <= 6) {
					tiles.push(F4);
					tileColors.push(DOORWAY_COLOR);
					continue;
				}
				// Doorway meeting ↔ kitchen: cols 18-19
				if (c >= 18 && c <= 19) {
					tiles.push(F4);
					tileColors.push(DOORWAY_COLOR);
					continue;
				}
				tiles.push(W);
				tileColors.push(WALL_FACE_COLOR);
				continue;
			}

			// Floor zones
			if (r < hWall && c < vWall) {
				tiles.push(F1);
				tileColors.push(WORK_AREA_COLOR);
				continue;
			}
			if (r < hWall && c > vWall) {
				tiles.push(F2);
				tileColors.push(MEETING_ROOM_COLOR);
				continue;
			}
			if (r > hWall && c < vWall) {
				tiles.push(F3);
				tileColors.push(LOUNGE_COLOR);
				continue;
			}
			if (r > hWall && c > vWall) {
				tiles.push(F5);
				tileColors.push(KITCHEN_COLOR);
				continue;
			}

			// Fallback (shouldn't reach here)
			tiles.push(F1);
			tileColors.push(WORK_AREA_COLOR);
		}
	}

	const furniture: PlacedFurniture[] = [
		// ═══ WORK AREA (top-left: cols 1-12, rows 1-8) ═══
		// Desks are 3×2 tiles (48×22px), chairs centered on desk width

		// Desk 1 (top-left): PC workstation — cols 2-4, rows 2-3
		{ uid: "desk-1", type: FurnitureType.DESK, col: 2, row: 2 },
		{ uid: "chair-1", type: "chair-back", col: 3, row: 3 },
		{ uid: "pc-1", type: FurnitureType.PC, col: 3, row: 2 },

		// Desk 2 (top-right): Laptop workstation — cols 7-9, rows 2-3
		{ uid: "desk-2", type: FurnitureType.DESK, col: 7, row: 2 },
		{ uid: "chair-2", type: "chair-back", col: 8, row: 3 },
		{ uid: "laptop-1", type: FurnitureType.LAPTOP, col: 8, row: 2 },

		// Desk 3 (bottom-left): Laptop workstation — cols 2-4, rows 5-6
		{ uid: "desk-3", type: FurnitureType.DESK, col: 2, row: 5 },
		{ uid: "chair-3", type: "chair-back", col: 3, row: 6 },
		{ uid: "laptop-2", type: FurnitureType.LAPTOP, col: 3, row: 5 },

		// Desk 4 (bottom-right): PC workstation — cols 7-9, rows 5-6
		{ uid: "desk-4", type: FurnitureType.DESK, col: 7, row: 5 },
		{ uid: "chair-4", type: "chair-back", col: 8, row: 6 },
		{ uid: "pc-2", type: FurnitureType.PC, col: 8, row: 5 },

		// Work area decor
		{ uid: "plant-wa-1", type: FurnitureType.PLANT, col: 1, row: 1 },
		{ uid: "plant-wa-2", type: FurnitureType.PLANT, col: 11, row: 1 },
		{ uid: "bookshelf-wa", type: FurnitureType.BOOKSHELF, col: 11, row: 3 },
		{ uid: "lamp-wa", type: FurnitureType.LAMP, col: 5, row: 2 },

		// ═══ MEETING ROOM (top-right: cols 14-22, rows 1-8) ═══

		// Meeting table — cols 17-19, rows 3-4
		{ uid: "table-1", type: FurnitureType.DESK, col: 17, row: 3 },

		// Chairs around the table (front above, back at desk solid row)
		{ uid: "chair-m-1", type: FurnitureType.CHAIR, col: 17, row: 2 },
		{ uid: "chair-m-2", type: FurnitureType.CHAIR, col: 19, row: 2 },
		{ uid: "chair-m-3", type: "chair-back", col: 17, row: 4 },
		{ uid: "chair-m-4", type: "chair-back", col: 19, row: 4 },

		// Whiteboard on north wall
		{ uid: "wb-1", type: FurnitureType.WHITEBOARD, col: 14, row: 0 },

		// Meeting room decor
		{ uid: "plant-mr-1", type: FurnitureType.PLANT, col: 22, row: 1 },
		{ uid: "plant-mr-2", type: FurnitureType.PLANT, col: 14, row: 7 },

		// ═══ LOUNGE (bottom-left: cols 1-12, rows 10-13) ═══

		// Bookshelves along left wall
		{ uid: "bookshelf-lg-1", type: FurnitureType.BOOKSHELF, col: 1, row: 10 },
		{ uid: "bookshelf-lg-2", type: FurnitureType.BOOKSHELF, col: 2, row: 10 },

		// Lounge decor
		{ uid: "plant-lg", type: FurnitureType.PLANT, col: 11, row: 10 },
		{ uid: "lamp-lg", type: FurnitureType.LAMP, col: 5, row: 13 },

		// ═══ KITCHEN (bottom-right: cols 14-22, rows 10-13) ═══

		// Kitchen appliances — 2×2 footprints
		{ uid: "cooler-k", type: FurnitureType.COOLER, col: 15, row: 10 },
		{ uid: "coffee-k", type: FurnitureType.COFFEE_MACHINE, col: 18, row: 10 },

		// Kitchen decor
		{ uid: "plant-k", type: FurnitureType.PLANT, col: 22, row: 10 },
		{ uid: "lamp-k", type: FurnitureType.LAMP, col: 21, row: 13 },
	];

	return { version: 1, cols: COLS, rows: ROWS, tiles, tileColors, furniture };
}

/** Serialize layout to JSON string */
export function serializeLayout(layout: OfficeLayout): string {
	return JSON.stringify(layout);
}

/** Deserialize layout from JSON string, migrating old tile types if needed */
export function deserializeLayout(json: string): OfficeLayout | null {
	try {
		const obj = JSON.parse(json);
		if (obj && obj.version === 1 && Array.isArray(obj.tiles) && Array.isArray(obj.furniture)) {
			return migrateLayout(obj as OfficeLayout);
		}
	} catch {
		/* ignore parse errors */
	}
	return null;
}

/**
 * Ensure layout has tileColors. If missing, generate defaults based on tile types.
 * Exported for use by message handlers that receive layouts over the wire.
 */
export function migrateLayoutColors(layout: OfficeLayout): OfficeLayout {
	return migrateLayout(layout);
}

/**
 * Migrate old layouts that use legacy tile types (TILE_FLOOR=1, WOOD_FLOOR=2, CARPET=3, DOORWAY=4)
 * to the new pattern-based system. If tileColors is already present, no migration needed.
 */
function migrateLayout(layout: OfficeLayout): OfficeLayout {
	if (layout.tileColors && layout.tileColors.length === layout.tiles.length) {
		return layout; // Already migrated
	}

	// Check if any tiles use old values (1-4) — these map directly to FLOOR_1-4
	// but need color assignments
	const tileColors: Array<FloorColor | null> = [];
	for (const tile of layout.tiles) {
		switch (tile) {
			case 0: // WALL
				tileColors.push(WALL_FACE_COLOR);
				break;
			case 1: // was TILE_FLOOR → FLOOR_1 beige
				tileColors.push(WORK_AREA_COLOR);
				break;
			case 2: // was WOOD_FLOOR → FLOOR_2 brown
				tileColors.push(MEETING_ROOM_COLOR);
				break;
			case 3: // was CARPET → FLOOR_3 purple
				tileColors.push(LOUNGE_COLOR);
				break;
			case 4: // was DOORWAY → FLOOR_4 tan
				tileColors.push(DOORWAY_COLOR);
				break;
			default:
				// New tile types (5-7) without colors — use neutral gray
				tileColors.push(tile > 0 ? { h: 0, s: 0, b: 0, c: 0 } : null);
		}
	}

	return { ...layout, tileColors };
}
