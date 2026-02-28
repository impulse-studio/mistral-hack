/**
 * Runtime tileset image loader.
 *
 * Loads a tileset PNG in the browser via <img> + offscreen canvas,
 * then extracts rectangular regions as SpriteData (string[][] hex colors).
 *
 * Used to pull furniture sprites from the Donarg Office Tileset.
 */

import type { SpriteData } from "./types";

/** Cached image data from loaded tilesets */
const loadedImages = new Map<string, ImageData>();

/**
 * Load a tileset PNG and cache its pixel data.
 * Returns the ImageData for pixel extraction.
 */
export async function loadTilesetImage(url: string): Promise<ImageData> {
	const cached = loadedImages.get(url);
	if (cached) return cached;

	const img = await new Promise<HTMLImageElement>((resolve, reject) => {
		const image = new Image();
		image.crossOrigin = "anonymous";
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error(`Failed to load tileset: ${url}`));
		image.src = url;
	});

	const canvas = document.createElement("canvas");
	canvas.width = img.width;
	canvas.height = img.height;
	const ctx = canvas.getContext("2d")!;
	ctx.drawImage(img, 0, 0);

	const imageData = ctx.getImageData(0, 0, img.width, img.height);
	loadedImages.set(url, imageData);
	return imageData;
}

/**
 * Extract a rectangular region from loaded ImageData as SpriteData.
 *
 * @param imageData - Source pixel data
 * @param sx - Source X (pixels)
 * @param sy - Source Y (pixels)
 * @param sw - Source width (pixels)
 * @param sh - Source height (pixels)
 * @returns SpriteData (string[][] of hex colors, '' for transparent)
 */
export function extractSprite(
	imageData: ImageData,
	sx: number,
	sy: number,
	sw: number,
	sh: number,
): SpriteData {
	const { data, width } = imageData;
	const rows: string[][] = [];

	for (let y = 0; y < sh; y++) {
		const row: string[] = [];
		for (let x = 0; x < sw; x++) {
			const px = sx + x;
			const py = sy + y;

			// Out of bounds → transparent
			if (px < 0 || py < 0 || px >= width || py >= imageData.height) {
				row.push("");
				continue;
			}

			const idx = (py * width + px) * 4;
			const r = data[idx];
			const g = data[idx + 1];
			const b = data[idx + 2];
			const a = data[idx + 3];

			// Fully transparent
			if (a < 10) {
				row.push("");
				continue;
			}

			row.push(
				`#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`,
			);
		}
		rows.push(row);
	}

	return rows;
}

/**
 * Extract a sprite by tile coordinates (16px grid).
 */
export function extractTileSprite(
	imageData: ImageData,
	tileCol: number,
	tileRow: number,
	tileCols: number,
	tileRows: number,
	tileSize = 16,
): SpriteData {
	return extractSprite(
		imageData,
		tileCol * tileSize,
		tileRow * tileSize,
		tileCols * tileSize,
		tileRows * tileSize,
	);
}
