/**
 * Metadata for furniture assets in the Donarg Office Tileset (16x16).
 *
 * Each entry maps an asset ID to its location in the tileset PNG
 * (pixel coordinates) and classification metadata for buildDynamicCatalog().
 *
 * Coordinates are from the "Office Tileset All 16x16.png" (256×512px).
 * These were identified visually from the tileset grid.
 */

export interface TilesetAssetMeta {
	/** Unique asset ID */
	id: string;
	/** Human-readable label */
	label: string;
	/** Pixel X in tileset */
	sx: number;
	/** Pixel Y in tileset */
	sy: number;
	/** Pixel width */
	sw: number;
	/** Pixel height */
	sh: number;
	/** Footprint width in tiles */
	footprintW: number;
	/** Footprint height in tiles */
	footprintH: number;
	/** Is this a desk surface agents can sit at? */
	isDesk: boolean;
	/** Catalog category */
	category: "desks" | "chairs" | "storage" | "electronics" | "decor" | "wall" | "misc";
	/** Rotation group ID (assets with same groupId can be rotated between each other) */
	groupId?: string;
	/** Orientation within rotation group */
	orientation?: string;
	/** On/off state */
	state?: string;
	/** Can be placed on desk surfaces */
	canPlaceOnSurfaces?: boolean;
	/** Number of background tile rows */
	backgroundTiles?: number;
	/** Can be placed on wall tiles */
	canPlaceOnWalls?: boolean;
}

/**
 * Curated list of key furniture assets from the Donarg Office Tileset.
 *
 * Tileset grid: 16 columns × 32 rows of 16×16 tiles (256×512px total).
 * Coordinates identified by visual inspection of the tileset PNG.
 */
export const TILESET_ASSETS: TilesetAssetMeta[] = [
	// ── Desks & Counters (top rows) ──────────────────────────────

	// Row 0-1: Wooden desks
	{
		id: "desk-wood-lg",
		label: "Desk (Large)",
		sx: 16,
		sy: 0,
		sw: 48,
		sh: 32,
		footprintW: 3,
		footprintH: 2,
		isDesk: true,
		category: "desks",
	},
	{
		id: "desk-wood-lg-2",
		label: "Desk (Large Alt)",
		sx: 64,
		sy: 0,
		sw: 48,
		sh: 32,
		footprintW: 3,
		footprintH: 2,
		isDesk: true,
		category: "desks",
	},
	{
		id: "desk-wood-sm",
		label: "Desk (Small)",
		sx: 0,
		sy: 32,
		sw: 32,
		sh: 32,
		footprintW: 2,
		footprintH: 2,
		isDesk: true,
		category: "desks",
	},

	// Counters / long desks
	{
		id: "counter-wood-lg",
		label: "Counter (Long)",
		sx: 112,
		sy: 0,
		sw: 112,
		sh: 32,
		footprintW: 7,
		footprintH: 2,
		isDesk: true,
		category: "desks",
	},
	{
		id: "counter-wood-sm",
		label: "Counter",
		sx: 224,
		sy: 0,
		sw: 32,
		sh: 16,
		footprintW: 2,
		footprintH: 1,
		isDesk: false,
		category: "desks",
	},

	// Row 2-3: Gray desks and counters
	{
		id: "desk-gray-lg",
		label: "Desk Gray",
		sx: 0,
		sy: 32,
		sw: 48,
		sh: 32,
		footprintW: 3,
		footprintH: 2,
		isDesk: true,
		category: "desks",
	},
	{
		id: "desk-gray-sm",
		label: "Desk Gray (Small)",
		sx: 48,
		sy: 32,
		sw: 32,
		sh: 32,
		footprintW: 2,
		footprintH: 2,
		isDesk: true,
		category: "desks",
	},

	// ── Cabinets & Shelving (rows 4-9) ───────────────────────────

	// Large cabinets
	{
		id: "cabinet-tall",
		label: "Cabinet (Tall)",
		sx: 0,
		sy: 64,
		sw: 32,
		sh: 48,
		footprintW: 2,
		footprintH: 3,
		isDesk: false,
		category: "storage",
		backgroundTiles: 1,
	},
	{
		id: "cabinet-wide",
		label: "Cabinet (Wide)",
		sx: 32,
		sy: 64,
		sw: 48,
		sh: 48,
		footprintW: 3,
		footprintH: 3,
		isDesk: false,
		category: "storage",
		backgroundTiles: 1,
	},

	// Bookshelves (colorful section around row 6-7)
	{
		id: "bookshelf-color-1",
		label: "Bookshelf",
		sx: 0,
		sy: 96,
		sw: 32,
		sh: 48,
		footprintW: 2,
		footprintH: 3,
		isDesk: false,
		category: "storage",
		backgroundTiles: 1,
	},
	{
		id: "bookshelf-color-2",
		label: "Bookshelf Alt",
		sx: 32,
		sy: 96,
		sw: 32,
		sh: 48,
		footprintW: 2,
		footprintH: 3,
		isDesk: false,
		category: "storage",
		backgroundTiles: 1,
	},

	// Small shelves
	{
		id: "shelf-sm",
		label: "Shelf",
		sx: 224,
		sy: 96,
		sw: 16,
		sh: 32,
		footprintW: 1,
		footprintH: 2,
		isDesk: false,
		category: "storage",
		backgroundTiles: 1,
	},

	// ── Chairs (around rows 10-11) ───────────────────────────────

	// Cushioned chairs (red/pink) - the most visible in Level 4
	{
		id: "chair-cushion-front",
		label: "Chair (Cushion)",
		sx: 0,
		sy: 160,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "chairs",
		groupId: "chair-cushion",
		orientation: "front",
	},
	{
		id: "chair-cushion-back",
		label: "Chair (Cushion) Back",
		sx: 16,
		sy: 160,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "chairs",
		groupId: "chair-cushion",
		orientation: "back",
	},
	{
		id: "chair-cushion-left",
		label: "Chair (Cushion) Left",
		sx: 32,
		sy: 160,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "chairs",
		groupId: "chair-cushion",
		orientation: "left",
	},
	{
		id: "chair-cushion-right",
		label: "Chair (Cushion) Right",
		sx: 48,
		sy: 160,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "chairs",
		groupId: "chair-cushion",
		orientation: "right",
	},

	// Office chairs (dark)
	{
		id: "chair-office-front",
		label: "Office Chair",
		sx: 64,
		sy: 160,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "chairs",
		groupId: "chair-office",
		orientation: "front",
	},
	{
		id: "chair-office-back",
		label: "Office Chair Back",
		sx: 80,
		sy: 160,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "chairs",
		groupId: "chair-office",
		orientation: "back",
	},

	// ── Electronics (rows 12-15) ─────────────────────────────────

	// Desktop monitors
	{
		id: "monitor-front",
		label: "Monitor",
		sx: 0,
		sy: 192,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "electronics",
		canPlaceOnSurfaces: true,
	},
	{
		id: "monitor-side",
		label: "Monitor (Side)",
		sx: 16,
		sy: 192,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "electronics",
		canPlaceOnSurfaces: true,
	},

	// Desktop computer (tower)
	{
		id: "pc-tower",
		label: "PC Tower",
		sx: 32,
		sy: 192,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "electronics",
	},

	// Laptop
	{
		id: "laptop-open",
		label: "Laptop",
		sx: 48,
		sy: 192,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "electronics",
		canPlaceOnSurfaces: true,
	},

	// Printer
	{
		id: "printer",
		label: "Printer",
		sx: 64,
		sy: 192,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "electronics",
	},

	// Phone
	{
		id: "phone",
		label: "Phone",
		sx: 80,
		sy: 192,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "electronics",
		canPlaceOnSurfaces: true,
	},

	// Clock
	{
		id: "clock",
		label: "Clock",
		sx: 96,
		sy: 192,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "decor",
		canPlaceOnWalls: true,
	},

	// ── Wall Decorations (rows 16-19) ────────────────────────────

	// Picture frames
	{
		id: "frame-sm",
		label: "Frame (Small)",
		sx: 0,
		sy: 256,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "wall",
		canPlaceOnWalls: true,
	},
	{
		id: "frame-md",
		label: "Frame (Medium)",
		sx: 16,
		sy: 256,
		sw: 32,
		sh: 16,
		footprintW: 2,
		footprintH: 1,
		isDesk: false,
		category: "wall",
		canPlaceOnWalls: true,
	},
	{
		id: "frame-lg",
		label: "Frame (Large)",
		sx: 48,
		sy: 256,
		sw: 48,
		sh: 16,
		footprintW: 3,
		footprintH: 1,
		isDesk: false,
		category: "wall",
		canPlaceOnWalls: true,
	},

	// ── Plants & Decor (rows 20-25) ──────────────────────────────

	// Potted plants
	{
		id: "plant-sm",
		label: "Plant (Small)",
		sx: 0,
		sy: 336,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "decor",
	},
	{
		id: "plant-lg",
		label: "Plant (Large)",
		sx: 16,
		sy: 336,
		sw: 16,
		sh: 32,
		footprintW: 1,
		footprintH: 2,
		isDesk: false,
		category: "decor",
		backgroundTiles: 1,
	},
	{
		id: "plant-tall",
		label: "Plant (Tall)",
		sx: 32,
		sy: 320,
		sw: 16,
		sh: 32,
		footprintW: 1,
		footprintH: 2,
		isDesk: false,
		category: "decor",
		backgroundTiles: 1,
	},

	// Water cooler
	{
		id: "cooler",
		label: "Water Cooler",
		sx: 48,
		sy: 336,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "misc",
	},

	// Coffee machine
	{
		id: "coffee-machine",
		label: "Coffee Machine",
		sx: 64,
		sy: 336,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "misc",
	},

	// ── Boxes & Storage (rows 26-31) ─────────────────────────────

	{
		id: "box-sm",
		label: "Box (Small)",
		sx: 0,
		sy: 416,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		category: "misc",
	},
	{
		id: "box-lg",
		label: "Box (Large)",
		sx: 16,
		sy: 416,
		sw: 32,
		sh: 16,
		footprintW: 2,
		footprintH: 1,
		isDesk: false,
		category: "misc",
	},
];
