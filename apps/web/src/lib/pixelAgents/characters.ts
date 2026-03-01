import { CharacterState, Direction, TILE_SIZE } from "./types";
import type { Character, Seat, SpriteData, TileType as TileTypeVal } from "./types";
import type { CharacterSprites } from "./spriteData";
import { findPath } from "./tileMap";
import {
	WALK_SPEED_PX_PER_SEC,
	WALK_FRAME_DURATION_SEC,
	TYPE_FRAME_DURATION_SEC,
	WANDER_PAUSE_MIN_SEC,
	WANDER_PAUSE_MAX_SEC,
	WANDER_MOVES_BEFORE_REST_MIN,
	WANDER_MOVES_BEFORE_REST_MAX,
	LOUNGE_ROW_START,
} from "./constants";

/** Tools that show reading animation instead of typing */
const READING_TOOLS = new Set(["Read", "Grep", "Glob", "WebFetch", "WebSearch"]);

export function isReadingTool(tool: string | null): boolean {
	if (!tool) return false;
	return READING_TOOLS.has(tool);
}

/** Pixel center of a tile */
function tileCenter(col: number, row: number): { x: number; y: number } {
	return {
		x: col * TILE_SIZE + TILE_SIZE / 2,
		y: row * TILE_SIZE + TILE_SIZE / 2,
	};
}

/** Direction from one tile to an adjacent tile */
function directionBetween(
	fromCol: number,
	fromRow: number,
	toCol: number,
	toRow: number,
): Direction {
	const dc = toCol - fromCol;
	const dr = toRow - fromRow;
	if (dc > 0) return Direction.RIGHT;
	if (dc < 0) return Direction.LEFT;
	if (dr > 0) return Direction.DOWN;
	return Direction.UP;
}

export function createCharacter(
	id: number,
	palette: number,
	seatId: string | null,
	seat: Seat | null,
	hueShift = 0,
): Character {
	const col = seat ? seat.seatCol : 1;
	const row = seat ? seat.seatRow : 1;
	const center = tileCenter(col, row);
	return {
		id,
		state: CharacterState.TYPE,
		dir: seat ? seat.facingDir : Direction.DOWN,
		x: center.x,
		y: center.y,
		tileCol: col,
		tileRow: row,
		path: [],
		moveProgress: 0,
		currentTool: null,
		palette,
		hueShift,
		frame: 0,
		frameTimer: 0,
		wanderTimer: 0,
		wanderCount: 0,
		wanderLimit: randomInt(WANDER_MOVES_BEFORE_REST_MIN, WANDER_MOVES_BEFORE_REST_MAX),
		isActive: true,
		seatId,
		bubbleType: null,
		bubbleTimer: 0,
		seatTimer: 0,
		isSubagent: false,
		parentAgentId: null,
		isGaming: false,
		gamingTimer: 0,
		isNuzzling: false,
		nuzzleTimer: 0,
		isDrinking: false,
		drinkTimer: 0,
		isEating: false,
		eatTimer: 0,
		isLeaving: false,
		matrixEffect: null,
		matrixEffectTimer: 0,
		matrixEffectSeeds: [],
	};
}

export function updateCharacter(
	ch: Character,
	dt: number,
	walkableTiles: Array<{ col: number; row: number }>,
	seats: Map<string, Seat>,
	tileMap: TileTypeVal[][],
	blockedTiles: Set<string>,
	loungeWalkableTiles?: Array<{ col: number; row: number }>,
): void {
	ch.frameTimer += dt;

	switch (ch.state) {
		case CharacterState.TYPE: {
			if (ch.frameTimer >= TYPE_FRAME_DURATION_SEC) {
				ch.frameTimer -= TYPE_FRAME_DURATION_SEC;
				ch.frame = (ch.frame + 1) % 2;
			}
			// Skip seat-leave logic while gaming — OfficeState manages the timer
			if (ch.isGaming) break;
			// If no longer active, stand up and start wandering (after seatTimer expires)
			if (!ch.isActive) {
				if (ch.seatTimer > 0) {
					ch.seatTimer -= dt;
					break;
				}
				ch.seatTimer = 0; // clear sentinel
				ch.state = CharacterState.IDLE;
				ch.frame = 0;
				ch.frameTimer = 0;
				ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC);
				ch.wanderCount = 0;
				ch.wanderLimit = randomInt(WANDER_MOVES_BEFORE_REST_MIN, WANDER_MOVES_BEFORE_REST_MAX);
			}
			break;
		}

		case CharacterState.IDLE: {
			// No idle animation — static pose
			ch.frame = 0;
			if (ch.seatTimer < 0) ch.seatTimer = 0; // clear turn-end sentinel
			// Skip seat-seeking when leaving — just stay idle until path is set
			if (ch.isLeaving) break;
			// Skip wander logic when gaming — OfficeState manages gaming state
			if (ch.isGaming) break;
			// Skip wander logic when nuzzling — OfficeState manages nuzzle state
			if (ch.isNuzzling) break;
			// Skip wander logic when drinking — OfficeState manages drink state
			if (ch.isDrinking) break;
			// Skip wander logic when eating — OfficeState manages eat state
			if (ch.isEating) break;
			// If became active, clear coffee bubble and pathfind to seat
			if (ch.isActive) {
				if (ch.bubbleType === "coffee") {
					ch.bubbleType = null;
					ch.bubbleTimer = 0;
				}
				if (!ch.seatId) {
					// No seat assigned — type in place
					ch.state = CharacterState.TYPE;
					ch.frame = 0;
					ch.frameTimer = 0;
					break;
				}
				const seat = seats.get(ch.seatId);
				if (seat) {
					const path = findPath(
						ch.tileCol,
						ch.tileRow,
						seat.seatCol,
						seat.seatRow,
						tileMap,
						blockedTiles,
					);
					if (path.length > 0) {
						ch.path = path;
						ch.moveProgress = 0;
						ch.state = CharacterState.WALK;
						ch.frame = 0;
						ch.frameTimer = 0;
					} else {
						// Already at seat or no path — sit down
						ch.state = CharacterState.TYPE;
						ch.dir = seat.facingDir;
						ch.frame = 0;
						ch.frameTimer = 0;
					}
				}
				break;
			}
			// Show coffee bubble when in the break area (lounge or kitchen)
			const inBreakArea = ch.tileRow >= LOUNGE_ROW_START;
			if (inBreakArea && !ch.bubbleType) {
				ch.bubbleType = "coffee";
				ch.bubbleTimer = 0;
			} else if (!inBreakArea && ch.bubbleType === "coffee") {
				ch.bubbleType = null;
				ch.bubbleTimer = 0;
			}
			// Countdown wander timer
			ch.wanderTimer -= dt;
			if (ch.wanderTimer <= 0) {
				// Coffee break: always wander in lounge/kitchen, never return to seat
				const wanderPool =
					loungeWalkableTiles && loungeWalkableTiles.length > 0
						? loungeWalkableTiles
						: walkableTiles;
				if (wanderPool.length > 0) {
					const target = wanderPool[Math.floor(Math.random() * wanderPool.length)];
					const path = findPath(
						ch.tileCol,
						ch.tileRow,
						target.col,
						target.row,
						tileMap,
						blockedTiles,
					);
					if (path.length > 0) {
						ch.path = path;
						ch.moveProgress = 0;
						ch.state = CharacterState.WALK;
						ch.frame = 0;
						ch.frameTimer = 0;
						ch.wanderCount++;
					} else {
						const pool = wanderPool === loungeWalkableTiles ? "lounge" : "all";
						console.log(
							"[wander] agent %d: no path from (%d,%d) to (%d,%d) pool=%s, stuck? active=%s gaming=%s nuzzle=%s drink=%s eat=%s leaving=%s",
							ch.id,
							ch.tileCol,
							ch.tileRow,
							target.col,
							target.row,
							pool,
							ch.isActive,
							ch.isGaming,
							ch.isNuzzling,
							ch.isDrinking,
							ch.isEating,
							ch.isLeaving,
						);
					}
				} else {
					console.log(
						"[wander] agent %d: empty wander pool at (%d,%d)",
						ch.id,
						ch.tileCol,
						ch.tileRow,
					);
				}
				ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC);
			}
			break;
		}

		case CharacterState.WALK: {
			// Walk animation
			if (ch.frameTimer >= WALK_FRAME_DURATION_SEC) {
				ch.frameTimer -= WALK_FRAME_DURATION_SEC;
				ch.frame = (ch.frame + 1) % 4;
			}

			if (ch.path.length === 0) {
				// Path complete — snap to tile center and transition
				const center = tileCenter(ch.tileCol, ch.tileRow);
				ch.x = center.x;
				ch.y = center.y;

				if (ch.isActive) {
					if (!ch.seatId) {
						// No seat — type in place
						ch.state = CharacterState.TYPE;
					} else {
						const seat = seats.get(ch.seatId);
						if (seat && ch.tileCol === seat.seatCol && ch.tileRow === seat.seatRow) {
							ch.state = CharacterState.TYPE;
							ch.dir = seat.facingDir;
						} else {
							ch.state = CharacterState.IDLE;
						}
					}
				} else {
					// Inactive — go to IDLE (will wander to break area)
					ch.state = CharacterState.IDLE;
					ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC);
				}
				ch.frame = 0;
				ch.frameTimer = 0;
				break;
			}

			// Move toward next tile in path
			const nextTile = ch.path[0];
			ch.dir = directionBetween(ch.tileCol, ch.tileRow, nextTile.col, nextTile.row);

			ch.moveProgress += (WALK_SPEED_PX_PER_SEC / TILE_SIZE) * dt;

			const fromCenter = tileCenter(ch.tileCol, ch.tileRow);
			const toCenter = tileCenter(nextTile.col, nextTile.row);
			const t = Math.min(ch.moveProgress, 1);
			ch.x = fromCenter.x + (toCenter.x - fromCenter.x) * t;
			ch.y = fromCenter.y + (toCenter.y - fromCenter.y) * t;

			if (ch.moveProgress >= 1) {
				// Arrived at next tile
				ch.tileCol = nextTile.col;
				ch.tileRow = nextTile.row;
				ch.x = toCenter.x;
				ch.y = toCenter.y;
				ch.path.shift();
				ch.moveProgress = 0;
			}

			// If became active while wandering, repath to seat
			if (ch.isActive && ch.seatId) {
				const seat = seats.get(ch.seatId);
				if (seat) {
					const lastStep = ch.path[ch.path.length - 1];
					if (!lastStep || lastStep.col !== seat.seatCol || lastStep.row !== seat.seatRow) {
						const newPath = findPath(
							ch.tileCol,
							ch.tileRow,
							seat.seatCol,
							seat.seatRow,
							tileMap,
							blockedTiles,
						);
						if (newPath.length > 0) {
							ch.path = newPath;
							ch.moveProgress = 0;
						}
					}
				}
			}
			break;
		}
	}
}

/** Get the correct sprite frame for a character's current state and direction */
export function getCharacterSprite(ch: Character, sprites: CharacterSprites): SpriteData {
	switch (ch.state) {
		case CharacterState.TYPE:
			if (isReadingTool(ch.currentTool)) {
				return sprites.reading[ch.dir][ch.frame % 2];
			}
			return sprites.typing[ch.dir][ch.frame % 2];
		case CharacterState.WALK:
			return sprites.walk[ch.dir][ch.frame % 4];
		case CharacterState.IDLE:
			return sprites.walk[ch.dir][1];
		default:
			return sprites.walk[ch.dir][1];
	}
}

function randomRange(min: number, max: number): number {
	return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
	return min + Math.floor(Math.random() * (max - min + 1));
}
