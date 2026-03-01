/**
 * Metadata for furniture assets in the Donarg Office Tileset (16x16).
 *
 * Coordinates from "Office Tileset All 16x16.png" (256×512px), identified
 * via flood-fill detection + visual inspection of the generated asset catalog.
 *
 * Assets whose `id` matches an existing FurnitureType value override the
 * inline sprites when buildDynamicCatalog() is called.
 */

import type { FurnitureCategory } from "./furnitureCatalog";

export interface TilesetAssetMeta {
	id: string;
	label: string;
	/** Extraction rectangle in tileset PNG (pixels) */
	sx: number;
	sy: number;
	sw: number;
	sh: number;
	footprintW: number;
	footprintH: number;
	isDesk: boolean;
	category: FurnitureCategory;
	groupId?: string;
	orientation?: string;
	state?: string;
	canPlaceOnSurfaces?: boolean;
	backgroundTiles?: number;
	canPlaceOnWalls?: boolean;
}

// ── Assets that REPLACE existing FurnitureType entries ────────────
// IDs here MUST match the FurnitureType enum values exactly.

const TILESET_REPLACEMENTS: TilesetAssetMeta[] = [
	// Desk: ASSET_0 — wooden desk (actual 40×22 at (20,0))
	// Extracting from x=16 to capture full desk within 48×32 (3×2 tiles)
	{
		id: "desk",
		label: "Desk",
		category: "desks",
		sx: 16,
		sy: 0,
		sw: 48,
		sh: 22,
		footprintW: 3,
		footprintH: 2,
		isDesk: true,
		backgroundTiles: 1,
	},

	// Chair: ASSET_32 — red cushioned chair front (actual 12×16 at (2,258))
	{
		id: "chair",
		label: "Chair",
		category: "chairs",
		sx: 0,
		sy: 256,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		groupId: "chair-cushion",
		orientation: "front",
	},
	// ASSET_33 — chair back
	{
		id: "chair-back",
		label: "Chair Back",
		category: "chairs",
		sx: 16,
		sy: 256,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		groupId: "chair-cushion",
		orientation: "back",
	},
	// ASSET_34 — chair left
	{
		id: "chair-left",
		label: "Chair Left",
		category: "chairs",
		sx: 32,
		sy: 256,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		groupId: "chair-cushion",
		orientation: "left",
	},
	// ASSET_35 — chair right
	{
		id: "chair-right",
		label: "Chair Right",
		category: "chairs",
		sx: 48,
		sy: 256,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		groupId: "chair-cushion",
		orientation: "right",
	},

	// Bookshelf: ASSET_46 — tall narrow bookshelf (actual 12×32 at (18,288))
	{
		id: "bookshelf",
		label: "Bookshelf",
		category: "storage",
		sx: 16,
		sy: 288,
		sw: 16,
		sh: 32,
		footprintW: 1,
		footprintH: 2,
		isDesk: false,
		backgroundTiles: 1,
	},

	// Plant: potted plant — foliage (32,448) + pot (32,464) (1×2)
	{
		id: "plant",
		label: "Plant",
		category: "decor",
		sx: 32,
		sy: 448,
		sw: 16,
		sh: 32,
		footprintW: 1,
		footprintH: 2,
		isDesk: false,
		backgroundTiles: 1,
	},

	// PC: ASSET_75 — monitor screen ON (actual 16×15 at (224,360))
	{
		id: "pc",
		label: "Monitor - On",
		category: "electronics",
		sx: 224,
		sy: 358,
		sw: 16,
		sh: 18,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		canPlaceOnSurfaces: true,
		groupId: "monitor",
		state: "on",
	},
	// PC OFF — same sprite region, darkened at load time
	{
		id: "pc_off",
		label: "Monitor - Off",
		category: "electronics",
		sx: 224,
		sy: 358,
		sw: 16,
		sh: 18,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		canPlaceOnSurfaces: true,
		groupId: "monitor",
		state: "off",
	},

	// Laptop: ASSET_73 — laptop screen ON (actual 16×15 at (192,360))
	{
		id: "laptop",
		label: "Laptop - On",
		category: "electronics",
		sx: 192,
		sy: 358,
		sw: 16,
		sh: 18,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		canPlaceOnSurfaces: true,
		groupId: "laptop-screen",
		state: "on",
	},
	// Laptop OFF — same sprite region, darkened at load time
	{
		id: "laptop_off",
		label: "Laptop - Off",
		category: "electronics",
		sx: 192,
		sy: 358,
		sw: 16,
		sh: 18,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		canPlaceOnSurfaces: true,
		groupId: "laptop-screen",
		state: "off",
	},

	// Whiteboard: ASSET_104 — landscape frame/board (actual 30×16 at (1,395))
	{
		id: "whiteboard",
		label: "Board",
		category: "wall",
		sx: 0,
		sy: 394,
		sw: 32,
		sh: 16,
		footprintW: 2,
		footprintH: 1,
		isDesk: false,
		canPlaceOnWalls: true,
	},

	// Cooler: ASSET_42 — fridge/cooler (actual 32×31 at (192,265))
	{
		id: "cooler",
		label: "Cooler",
		category: "misc",
		sx: 192,
		sy: 264,
		sw: 32,
		sh: 32,
		footprintW: 2,
		footprintH: 2,
		isDesk: false,
	},

	// Coffee machine: no direct match, using ASSET_43 — large appliance
	{
		id: "coffee_machine",
		label: "Coffee Machine",
		category: "misc",
		sx: 224,
		sy: 264,
		sw: 32,
		sh: 32,
		footprintW: 2,
		footprintH: 2,
		isDesk: false,
	},
];

// ── Extra tileset-only furniture (additions to catalog) ──────────

const TILESET_EXTRAS: TilesetAssetMeta[] = [
	// Dark office chair: ASSET_36-39
	{
		id: "chair-office",
		label: "Office Chair",
		category: "chairs",
		sx: 64,
		sy: 256,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		groupId: "chair-office",
		orientation: "front",
	},
	{
		id: "chair-office-back",
		label: "Office Chair Back",
		category: "chairs",
		sx: 80,
		sy: 256,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		groupId: "chair-office",
		orientation: "back",
	},
	{
		id: "chair-office-left",
		label: "Office Chair Left",
		category: "chairs",
		sx: 96,
		sy: 256,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		groupId: "chair-office",
		orientation: "left",
	},
	{
		id: "chair-office-right",
		label: "Office Chair Right",
		category: "chairs",
		sx: 112,
		sy: 256,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		groupId: "chair-office",
		orientation: "right",
	},

	// Tall plant: ASSET_133 (1×2)
	{
		id: "plant-tall",
		label: "Tall Plant",
		category: "decor",
		sx: 128,
		sy: 448,
		sw: 16,
		sh: 32,
		footprintW: 1,
		footprintH: 2,
		isDesk: false,
		backgroundTiles: 1,
	},

	// Clock: ASSET_77 (1×1 wall decoration)
	{
		id: "clock",
		label: "Clock",
		category: "wall",
		sx: 80,
		sy: 358,
		sw: 16,
		sh: 18,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		canPlaceOnWalls: true,
	},

	// Small portrait frame: ASSET_106
	{
		id: "frame-sm",
		label: "Frame",
		category: "wall",
		sx: 64,
		sy: 394,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
		canPlaceOnWalls: true,
	},

	// Landscape painting: ASSET_105 (2×1)
	{
		id: "painting",
		label: "Painting",
		category: "wall",
		sx: 32,
		sy: 394,
		sw: 32,
		sh: 16,
		footprintW: 2,
		footprintH: 1,
		isDesk: false,
		canPlaceOnWalls: true,
	},

	// Bookshelf variant: ASSET_47
	{
		id: "bookshelf-2",
		label: "Bookshelf Alt",
		category: "storage",
		sx: 32,
		sy: 288,
		sw: 16,
		sh: 32,
		footprintW: 1,
		footprintH: 2,
		isDesk: false,
		backgroundTiles: 1,
	},

	// Desk variant: ASSET_1
	{
		id: "desk-alt",
		label: "Desk Alt",
		category: "desks",
		sx: 64,
		sy: 0,
		sw: 48,
		sh: 22,
		footprintW: 3,
		footprintH: 2,
		isDesk: true,
		backgroundTiles: 1,
	},

	// Water dispenser: ASSET_40 — tall water cooler with blue jug (1×2)
	{
		id: "water_dispenser",
		label: "Water Dispenser",
		category: "misc",
		sx: 144,
		sy: 256,
		sw: 16,
		sh: 32,
		footprintW: 1,
		footprintH: 2,
		isDesk: false,
		backgroundTiles: 1,
	},

	// Plant bush variant: ASSET_130
	{
		id: "plant-bush",
		label: "Bush",
		category: "decor",
		sx: 80,
		sy: 448,
		sw: 16,
		sh: 16,
		footprintW: 1,
		footprintH: 1,
		isDesk: false,
	},
];

/** All tileset assets (replacements + extras) */
export const TILESET_ASSETS: TilesetAssetMeta[] = [...TILESET_REPLACEMENTS, ...TILESET_EXTRAS];

/** IDs of assets that replace existing FurnitureType entries */
export const TILESET_REPLACEMENT_IDS = new Set(TILESET_REPLACEMENTS.map((a) => a.id));
