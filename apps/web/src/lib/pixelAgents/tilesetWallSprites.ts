/**
 * 16 wall auto-tile sprites indexed by 4-bit neighbor bitmask.
 * Bitmask convention: N=1, E=2, S=4, W=8.
 *   Bit SET → neighbor wall EXISTS → no border on that side.
 *   Bit NOT SET → no neighbor → draw border/edge on that side.
 *
 * Each sprite is 16px wide × 24px tall (grayscale for colorization).
 * Bottom 16px = front face, top 8px = visible top surface.
 * The wallTiles engine anchors at tile bottom: offsetY = TILE_SIZE - spriteHeight.
 *
 * Gray values control the final appearance after HSL colorization:
 *   ~200+ = highlight (top surface, light edges)
 *   ~160  = wall face fill
 *   ~130  = subtle shading
 *   ~60-80 = dark outlines / borders
 */

import type { SpriteData } from "./types";

// ── Gray constants ──────────────────────────────────────────────

const HL = "#D8D8D8"; // highlight (top surface, upper edges)
const HM = "#C8C8C8"; // highlight medium
const FC = "#B0B0B0"; // face center (main wall color)
const FM = "#A0A0A0"; // face medium (slightly darker)
const SH = "#888888"; // shadow (bottom edges of top surface)
const DK = "#505050"; // dark outline (exposed edges)
const DD = "#404040"; // darkest (corner outlines)
const TP = ""; // transparent

const W = 16; // width
const H = 24; // total height (8 top + 16 face)

// ── Builder ─────────────────────────────────────────────────────

/**
 * Build a wall sprite for a given bitmask.
 *
 * The sprite has 3 zones:
 *   rows 0-7:   top surface (visible from isometric-ish view)
 *   rows 8-22:  front face
 *   row 23:     bottom edge
 *
 * Borders are drawn on sides that have NO neighbor.
 */
function buildWall(mask: number): SpriteData {
	const hasN = (mask & 1) !== 0;
	const hasE = (mask & 2) !== 0;
	const hasS = (mask & 4) !== 0;
	const hasW = (mask & 8) !== 0;

	const rows: string[][] = [];

	for (let y = 0; y < H; y++) {
		const row: string[] = [];
		for (let x = 0; x < W; x++) {
			row.push(getWallPixel(x, y, hasN, hasE, hasS, hasW));
		}
		rows.push(row);
	}

	return rows;
}

function getWallPixel(
	x: number,
	y: number,
	hasN: boolean,
	hasE: boolean,
	hasS: boolean,
	hasW: boolean,
): string {
	// ── Top surface (rows 0-7) ──────────────────────────────────
	if (y < 8) {
		// No top surface if there's a neighbor to the north
		// (the north wall covers this area visually)
		if (hasN) return TP;

		// Outer corners
		if (!hasW && x === 0) return y === 0 ? DD : DK;
		if (!hasE && x === 15) return y === 0 ? DD : DK;
		if (y === 0) return !hasN ? DK : TP;

		// Left/right edges of top surface
		if (!hasW && x === 1) return y === 1 ? HL : HM;
		if (!hasE && x === 14) return y === 1 ? HM : FM;

		// Dark edge at x=0/x=15 if neighbor exists (wall continues)
		if (hasW && x === 0) return TP;
		if (hasE && x === 15) return TP;

		// Top surface fill
		if (y === 1) return HL; // top highlight
		if (y === 7) return SH; // bottom shadow of top surface
		if (y === 6) return FM; // pre-shadow
		return HM; // mid fill
	}

	// ── Front face (rows 8-23) ──────────────────────────────────
	const faceY = y - 8; // 0-15 within front face

	// Left border (no west neighbor)
	if (!hasW && x === 0) {
		return faceY === 15 && !hasS ? DD : DK;
	}

	// Right border (no east neighbor)
	if (!hasE && x === 15) {
		return faceY === 15 && !hasS ? DD : DK;
	}

	// Bottom border (no south neighbor)
	if (!hasS && faceY === 15) {
		return DK;
	}

	// Top of face (transition from top surface or border)
	if (faceY === 0) {
		if (hasN) return FC; // continuous wall from north
		return SH; // shadow under top surface
	}

	// Inner left highlight (1px from left border)
	if (!hasW && x === 1) return faceY <= 1 ? FM : FC;

	// Inner right shadow (1px from right border)
	if (!hasE && x === 14) return FM;

	// Bottom shadow (1px from bottom border)
	if (!hasS && faceY === 14) return FM;

	// Face fill with subtle vertical gradient
	if (faceY <= 2) return FC;
	if (faceY >= 13) return FM;
	return FC;
}

// ── Generate all 16 variants ────────────────────────────────────

export const WALL_SPRITES: SpriteData[] = Array.from({ length: 16 }, (_, mask) => buildWall(mask));
