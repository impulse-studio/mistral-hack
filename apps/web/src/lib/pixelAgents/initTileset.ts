/**
 * Tileset initialization — loads floor patterns, wall sprites, and (optionally)
 * furniture from the Donarg Office Tileset PNG.
 *
 * Call `initTileset()` once before creating OfficeState to get:
 *   - Textured diamond/cross floor patterns (via setFloorSprites)
 *   - 3D beveled wall auto-tiles (via setWallSprites)
 *   - Tileset furniture catalog (via buildDynamicCatalog) [optional]
 */

import { setFloorSprites } from "./floorTiles";
import { setWallSprites } from "./wallTiles";
import { buildDynamicCatalog } from "./furnitureCatalog";
import type { LoadedAssetData } from "./furnitureCatalog";
import { FLOOR_PATTERNS } from "./tilesetFloorPatterns";
import { WALL_SPRITES } from "./tilesetWallSprites";
import { loadTilesetImage, extractSprite } from "./tilesetLoader";
import { TILESET_ASSETS } from "./tilesetMetadata";
import type { SpriteData } from "./types";

let initialized = false;

/**
 * Initialize the tileset system.
 *
 * @param loadFurniture - If true, also loads the tileset PNG and extracts
 *   furniture sprites for buildDynamicCatalog(). Default: false (faster startup).
 * @param tilesetUrl - URL of the tileset PNG. Default: '/assets/office/tileset.png'
 */
export async function initTileset(
	loadFurniture = false,
	tilesetUrl = "/assets/office/tileset.png",
): Promise<void> {
	if (initialized) return;

	// ── Floor patterns (synchronous — inline data) ─────────────
	setFloorSprites(FLOOR_PATTERNS);
	console.log(`✓ Loaded ${FLOOR_PATTERNS.length} floor patterns`);

	// ── Wall auto-tile sprites (synchronous — inline data) ─────
	setWallSprites(WALL_SPRITES);
	console.log(`✓ Loaded ${WALL_SPRITES.length} wall sprites`);

	// ── Furniture from tileset PNG (async — image loading) ─────
	if (loadFurniture) {
		try {
			const imageData = await loadTilesetImage(tilesetUrl);
			const sprites: Record<string, SpriteData> = {};
			const catalog: LoadedAssetData["catalog"] = [];

			for (const asset of TILESET_ASSETS) {
				const sprite = extractSprite(imageData, asset.sx, asset.sy, asset.sw, asset.sh);

				// Skip empty sprites (all transparent)
				const hasPixels = sprite.some((row) => row.some((px) => px !== ""));
				if (!hasPixels) {
					console.warn(`Skipping empty sprite: ${asset.id}`);
					continue;
				}

				sprites[asset.id] = sprite;
				catalog.push({
					id: asset.id,
					label: asset.label,
					category: asset.category,
					width: asset.sw,
					height: asset.sh,
					footprintW: asset.footprintW,
					footprintH: asset.footprintH,
					isDesk: asset.isDesk,
					groupId: asset.groupId,
					orientation: asset.orientation,
					state: asset.state,
					canPlaceOnSurfaces: asset.canPlaceOnSurfaces,
					backgroundTiles: asset.backgroundTiles,
					canPlaceOnWalls: asset.canPlaceOnWalls,
				});
			}

			if (catalog.length > 0) {
				const ok = buildDynamicCatalog({ catalog, sprites });
				if (ok) {
					console.log(`✓ Built dynamic catalog with ${catalog.length} tileset assets`);
				}
			}
		} catch (err) {
			console.warn("Could not load tileset furniture (falling back to built-in sprites):", err);
		}
	}

	initialized = true;
}

/** Check if tileset has been initialized */
export function isTilesetReady(): boolean {
	return initialized;
}
