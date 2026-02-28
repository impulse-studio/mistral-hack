/**
 * Grayscale floor tile patterns for HSL colorization.
 * Each pattern is a 16×16 SpriteData (string[][] of hex gray values).
 * The colorize module (floorTiles.ts) tints these via Photoshop-style Colorize:
 *   perceived luminance → HSL(hue, sat, luminance).
 *
 * Lighter grays → brighter output, darker grays → darker output.
 * Pattern visual: diamond grid borders darker, centers lighter → beveled tile look.
 */

import type { SpriteData } from "./types";

// ── Helpers ──────────────────────────────────────────────────────

function gray(v: number): string {
	const clamped = Math.max(0, Math.min(255, Math.round(v)));
	const hex = clamped.toString(16).padStart(2, "0");
	return `#${hex}${hex}${hex}`;
}

function makePattern(fn: (x: number, y: number) => number): SpriteData {
	const rows: string[][] = [];
	for (let y = 0; y < 16; y++) {
		const row: string[] = [];
		for (let x = 0; x < 16; x++) {
			row.push(gray(fn(x, y)));
		}
		rows.push(row);
	}
	return rows;
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * Math.max(0, Math.min(1, t));
}

// ── Pattern 1: Diamond Grid ─────────────────────────────────────
// Diagonal lines every 8px forming a diamond lattice. Most common floor.
// Matches the teal diamond floor visible in Donarg Level 4 design.
const PATTERN_DIAMOND = makePattern((x, y) => {
	const d1 = (x + y) % 8;
	const d2 = (((x - y) % 8) + 8) % 8;

	const onLine1 = d1 === 0;
	const onLine2 = d2 === 0;

	// Intersection (both lines cross) → darkest
	if (onLine1 && onLine2) return 105;
	// On a single line → dark border
	if (onLine1 || onLine2) return 115;

	// Interior: brighten toward center of each diamond
	const dist1 = Math.min(d1, 8 - d1);
	const dist2 = Math.min(d2, 8 - d2);
	const dist = Math.min(dist1, dist2);
	return lerp(125, 155, dist / 4);
});

// ── Pattern 2: Large Diamond ────────────────────────────────────
// Bigger diamonds (period 16) for a more open feel.
const PATTERN_LARGE_DIAMOND = makePattern((x, y) => {
	// Manhattan distance from center of tile
	const cx = Math.abs(x - 7.5);
	const cy = Math.abs(y - 7.5);
	const manhattan = cx + cy;

	// Diamond border at distance ~6
	if (Math.abs(manhattan - 6) < 0.8) return 110;
	// Inner highlight
	if (manhattan < 5) return lerp(140, 160, 1 - manhattan / 5);
	// Outer area
	return 125;
});

// ── Pattern 3: Cross Hatch ──────────────────────────────────────
// Horizontal + vertical lines every 4px creating a grid/cross pattern.
const PATTERN_CROSS = makePattern((x, y) => {
	const onH = y % 4 === 0;
	const onV = x % 4 === 0;

	if (onH && onV) return 100; // intersection
	if (onH || onV) return 115; // line
	return lerp(135, 150, Math.min(x % 4, y % 4) / 2);
});

// ── Pattern 4: Checkered ────────────────────────────────────────
// 8×8 alternating light/dark squares with subtle edge highlights.
const PATTERN_CHECKERED = makePattern((x, y) => {
	const cell = ((x >> 3) + (y >> 3)) % 2;
	const lx = x % 8;
	const ly = y % 8;

	// Edge highlight (1px border on each square)
	const isEdge = lx === 0 || ly === 0 || lx === 7 || ly === 7;

	if (cell === 0) {
		return isEdge ? 120 : 140;
	}
	return isEdge ? 130 : 150;
});

// ── Pattern 5: Bordered Tile ────────────────────────────────────
// Single tile with a visible border and raised center.
const PATTERN_BORDERED = makePattern((x, y) => {
	// 1px dark border around the tile edges
	if (x === 0 || y === 0 || x === 15 || y === 15) return 105;
	// 1px lighter inner border
	if (x === 1 || y === 1 || x === 14 || y === 14) return 120;
	// Raised center
	return 145;
});

// ── Pattern 6: Fine Grid ────────────────────────────────────────
// Thin lines every 2px for a very fine textile/grid texture.
const PATTERN_FINE_GRID = makePattern((x, y) => {
	const onH = y % 2 === 0;
	const onV = x % 2 === 0;

	if (onH && onV) return 120;
	if (onH || onV) return 132;
	return 145;
});

// ── Pattern 7: Smooth ───────────────────────────────────────────
// Nearly solid with very subtle noise for visual interest.
const PATTERN_SMOOTH = makePattern((x, y) => {
	// Subtle 4px checkerboard noise
	const noise = ((x + y) % 2) * 3;
	return 138 + noise;
});

// ── Export ───────────────────────────────────────────────────────

/**
 * All 7 floor patterns in order. Index maps to TileType:
 *   FLOOR_1 (value 1) → patterns[0] (Diamond)
 *   FLOOR_2 (value 2) → patterns[1] (Large Diamond)
 *   ...
 *   FLOOR_7 (value 7) → patterns[6] (Smooth)
 */
export const FLOOR_PATTERNS: SpriteData[] = [
	PATTERN_DIAMOND,
	PATTERN_LARGE_DIAMOND,
	PATTERN_CROSS,
	PATTERN_CHECKERED,
	PATTERN_BORDERED,
	PATTERN_FINE_GRID,
	PATTERN_SMOOTH,
];
