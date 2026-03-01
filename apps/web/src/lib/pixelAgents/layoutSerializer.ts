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
const MANAGER_OFFICE_COLOR: FloorColor = { h: 25, s: 30, b: 12, c: 10 }; // warm amber (private office)
const LOUNGE_COLOR: FloorColor = { h: 210, s: 20, b: 5, c: 0 }; // cool blue-gray
const KITCHEN_COLOR: FloorColor = { h: 180, s: 20, b: 10, c: 0 }; // muted teal
const DOORWAY_COLOR: FloorColor = { h: 35, s: 25, b: 10, c: 0 }; // warm tan transition
const WALL_FACE_COLOR: FloorColor = { h: 30, s: 12, b: 35, c: 15 }; // cream/beige (Level 4 walls)

/**
 * Create the default office layout — 30×17 grid with 4 rooms:
 *
 *  ┌─────────────────────────────┬─────────────┐
 *  │  WORKSPACE (8 worker desks) │  MANAGER    │
 *  │  cols 1-19, rows 1-8       │  OFFICE     │
 *  │  Row 1: desks 1-4           │  cols 21-28 │
 *  │  Row 2: desks 5-8           │  rows 1-8   │
 *  ├───── ───────────────────────┤── ──────────┤
 *  │  LOUNGE                     │  KITCHEN    │
 *  │  cols 1-19, rows 10-15     │  cols 21-28 │
 *  │  bookshelves, plants        │  rows 10-15 │
 *  └─────────────────────────────┴─────────────┘
 *  vWall=20, hWall=9
 */
export function createDefaultLayout(): OfficeLayout {
	const COLS = DEFAULT_COLS; // 30
	const ROWS = DEFAULT_ROWS; // 17
	const W = TileType.WALL;
	const F1 = TileType.FLOOR_1; // workspace
	const F2 = TileType.FLOOR_2; // manager office
	const F3 = TileType.FLOOR_3; // lounge
	const F4 = TileType.FLOOR_4; // doorway
	const F5 = TileType.FLOOR_5; // kitchen

	const tiles: TileTypeVal[] = [];
	const tileColors: Array<FloorColor | null> = [];

	const vWall = 20; // vertical divider between workspace/manager & lounge/kitchen
	const hWall = 9; // horizontal divider between top & bottom rooms

	for (let r = 0; r < ROWS; r++) {
		for (let c = 0; c < COLS; c++) {
			// Outer boundary
			if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
				// Entrance door opening in bottom wall (cols 2-4)
				if (r === ROWS - 1 && c >= 2 && c <= 4) {
					tiles.push(F4);
					tileColors.push(DOORWAY_COLOR);
					continue;
				}
				tiles.push(W);
				tileColors.push(WALL_FACE_COLOR);
				continue;
			}

			// Vertical divider wall at col 20
			if (c === vWall) {
				// Doorway workspace ↔ manager office: rows 4-5
				if (r >= 4 && r <= 5) {
					tiles.push(F4);
					tileColors.push(DOORWAY_COLOR);
					continue;
				}
				// Doorway lounge ↔ kitchen: rows 12-13
				if (r >= 12 && r <= 13) {
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
				// Doorway workspace ↔ lounge: cols 9-10
				if (c >= 9 && c <= 10) {
					tiles.push(F4);
					tileColors.push(DOORWAY_COLOR);
					continue;
				}
				// Doorway manager ↔ kitchen: cols 24-25
				if (c >= 24 && c <= 25) {
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
				tileColors.push(MANAGER_OFFICE_COLOR);
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

			// Fallback
			tiles.push(F1);
			tileColors.push(WORK_AREA_COLOR);
		}
	}

	const furniture: PlacedFurniture[] = [
		// ═══ WORKSPACE (top-left: cols 1-19, rows 1-8) ═══
		// 8 worker desks: 2 rows × 4 cols, desks are 3×2 tiles

		// Top row — desks 1-4 at rows 2-3
		{ uid: "desk-1", type: FurnitureType.DESK, col: 2, row: 2 },
		{ uid: "chair-1", type: "chair-back", col: 3, row: 3 },
		{ uid: "pc-1", type: FurnitureType.PC_OFF, col: 3, row: 2 },

		{ uid: "desk-2", type: FurnitureType.DESK, col: 6, row: 2 },
		{ uid: "chair-2", type: "chair-back", col: 7, row: 3 },
		{ uid: "laptop-1", type: FurnitureType.LAPTOP_OFF, col: 7, row: 2 },

		{ uid: "desk-3", type: FurnitureType.DESK, col: 10, row: 2 },
		{ uid: "chair-3", type: "chair-back", col: 11, row: 3 },
		{ uid: "pc-2", type: FurnitureType.PC_OFF, col: 11, row: 2 },

		{ uid: "desk-4", type: FurnitureType.DESK, col: 14, row: 2 },
		{ uid: "chair-4", type: "chair-back", col: 15, row: 3 },
		{ uid: "laptop-2", type: FurnitureType.LAPTOP_OFF, col: 15, row: 2 },

		// Bottom row — desks 5-8 at rows 5-6
		{ uid: "desk-5", type: FurnitureType.DESK, col: 2, row: 5 },
		{ uid: "chair-5", type: "chair-back", col: 3, row: 6 },
		{ uid: "laptop-3", type: FurnitureType.LAPTOP_OFF, col: 3, row: 5 },

		{ uid: "desk-6", type: FurnitureType.DESK, col: 6, row: 5 },
		{ uid: "chair-6", type: "chair-back", col: 7, row: 6 },
		{ uid: "pc-3", type: FurnitureType.PC_OFF, col: 7, row: 5 },

		{ uid: "desk-7", type: FurnitureType.DESK, col: 10, row: 5 },
		{ uid: "chair-7", type: "chair-back", col: 11, row: 6 },
		{ uid: "laptop-4", type: FurnitureType.LAPTOP_OFF, col: 11, row: 5 },

		{ uid: "desk-8", type: FurnitureType.DESK, col: 14, row: 5 },
		{ uid: "chair-8", type: "chair-back", col: 15, row: 6 },
		{ uid: "pc-4", type: FurnitureType.PC_OFF, col: 15, row: 5 },

		// Workspace decor
		{ uid: "plant-ws-1", type: FurnitureType.PLANT, col: 1, row: 1 },
		{ uid: "plant-ws-2", type: FurnitureType.PLANT, col: 18, row: 1 },
		{ uid: "lamp-ws-1", type: FurnitureType.LAMP, col: 5, row: 2 },
		{ uid: "lamp-ws-2", type: FurnitureType.LAMP, col: 13, row: 2 },
		{ uid: "bookshelf-ws", type: FurnitureType.BOOKSHELF, col: 18, row: 4 },

		// ═══ MANAGER OFFICE (top-right: cols 21-28, rows 1-8) ═══

		// Manager desk with PC — cols 24-26, rows 3-4
		{ uid: "desk-mgr", type: FurnitureType.DESK, col: 24, row: 3 },
		{ uid: "chair-mgr", type: "chair-back", col: 25, row: 4 },
		{ uid: "pc-mgr", type: FurnitureType.PC_OFF, col: 25, row: 3 },

		// Manager office decor
		{ uid: "wb-mgr", type: FurnitureType.WHITEBOARD, col: 22, row: 0 },
		{ uid: "bookshelf-mgr-1", type: FurnitureType.BOOKSHELF, col: 21, row: 2 },
		{ uid: "bookshelf-mgr-2", type: FurnitureType.BOOKSHELF, col: 22, row: 2 },
		{ uid: "plant-mgr-1", type: FurnitureType.PLANT, col: 28, row: 1 },
		{ uid: "plant-mgr-2", type: FurnitureType.PLANT, col: 21, row: 7 },
		{ uid: "lamp-mgr", type: FurnitureType.LAMP, col: 27, row: 5 },

		// ═══ LOUNGE (bottom-left: cols 1-19, rows 10-15) ═══

		// Bookshelves along left wall
		{ uid: "bookshelf-lg-1", type: FurnitureType.BOOKSHELF, col: 1, row: 10 },
		{ uid: "bookshelf-lg-2", type: FurnitureType.BOOKSHELF, col: 2, row: 10 },
		{ uid: "bookshelf-lg-3", type: FurnitureType.BOOKSHELF, col: 3, row: 10 },

		// Game table in the lounge (near the entrance door)
		{ uid: "game-table", type: FurnitureType.DESK, col: 8, row: 12 },
		{ uid: "game-laptop", type: FurnitureType.LAPTOP, col: 9, row: 12 },

		// Lounge decor
		{ uid: "plant-lg-1", type: FurnitureType.PLANT, col: 18, row: 10 },
		{ uid: "plant-lg-2", type: FurnitureType.PLANT, col: 1, row: 14 },
		{ uid: "lamp-lg-1", type: FurnitureType.LAMP, col: 11, row: 14 },
		{ uid: "lamp-lg-2", type: FurnitureType.LAMP, col: 15, row: 10 },

		// ═══ KITCHEN (bottom-right: cols 21-28, rows 10-15) ═══

		// Kitchen appliances
		{ uid: "cooler-k", type: FurnitureType.COOLER, col: 22, row: 10 },
		{ uid: "coffee-k", type: FurnitureType.COFFEE_MACHINE, col: 25, row: 10 },

		// Kitchen decor
		{ uid: "plant-k", type: FurnitureType.PLANT, col: 28, row: 10 },
		{ uid: "lamp-k", type: FurnitureType.LAMP, col: 27, row: 14 },
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
			case 2: // was WOOD_FLOOR → FLOOR_2
				tileColors.push(MANAGER_OFFICE_COLOR);
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
