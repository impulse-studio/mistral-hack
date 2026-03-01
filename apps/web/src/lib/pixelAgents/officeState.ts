import { TILE_SIZE, MATRIX_EFFECT_DURATION, CharacterState, Direction } from "./types";
import {
	PALETTE_COUNT,
	HUE_SHIFT_MIN_DEG,
	HUE_SHIFT_RANGE_DEG,
	WAITING_BUBBLE_DURATION_SEC,
	DISMISS_BUBBLE_FAST_FADE_SEC,
	INACTIVE_SEAT_TIMER_MIN_SEC,
	INACTIVE_SEAT_TIMER_RANGE_SEC,
	AUTO_ON_FACING_DEPTH,
	AUTO_ON_SIDE_DEPTH,
	CHARACTER_SITTING_OFFSET_PX,
	CHARACTER_HIT_HALF_WIDTH,
	CHARACTER_HIT_HEIGHT,
	LOUNGE_ROW_START,
	LOUNGE_COL_MAX,
	EXIT_TILES,
	CAT_WALK_SPEED_PX_PER_SEC,
	CAT_PAUSE_MIN_SEC,
	CAT_PAUSE_MAX_SEC,
	CAT_RENDER_WIDTH,
	CAT_WAYPOINTS,
	GAMING_STAND_COL,
	GAMING_STAND_ROW,
	GAMING_FACE_DIR,
	GAMING_DURATION_MIN_SEC,
	GAMING_DURATION_MAX_SEC,
	GAMING_CHECK_INTERVAL_SEC,
	GAMING_CHANCE,
	NUZZLE_CHECK_INTERVAL_SEC,
	NUZZLE_CHANCE,
	NUZZLE_HAND_DURATION_SEC,
	NUZZLE_HEART_DURATION_SEC,
	DRINK_CHECK_INTERVAL_SEC,
	DRINK_CHANCE,
	DRINK_DURATION_SEC,
	FOOD_CHECK_INTERVAL_SEC,
	FOOD_CHANCE,
	FOOD_DURATION_SEC,
} from "./constants";
import type {
	Character,
	Seat,
	FurnitureInstance,
	TileType as TileTypeVal,
	OfficeLayout,
	PlacedFurniture,
	WalkingCat,
} from "./types";
import { FurnitureType } from "./types";
import { createCharacter, updateCharacter } from "./characters";
import { matrixEffectSeeds } from "./matrixEffect";
import { isWalkable, getWalkableTiles, findPath } from "./tileMap";
import {
	createDefaultLayout,
	layoutToTileMap,
	layoutToFurnitureInstances,
	layoutToSeats,
	getBlockedTiles,
} from "./layoutSerializer";
import { getCatalogEntry, getOnStateType, getOffStateType } from "./furnitureCatalog";

export class OfficeState {
	layout: OfficeLayout;
	tileMap: TileTypeVal[][];
	seats: Map<string, Seat>;
	blockedTiles: Set<string>;
	furniture: FurnitureInstance[];
	walkableTiles: Array<{ col: number; row: number }>;
	loungeWalkableTiles: Array<{ col: number; row: number }>;
	characters: Map<number, Character> = new Map();
	selectedAgentId: number | null = null;
	cameraFollowId: number | null = null;
	hoveredAgentId: number | null = null;
	hoveredTile: { col: number; row: number } | null = null;
	/** Maps "parentId:toolId" → sub-agent character ID (negative) */
	subagentIdMap: Map<string, number> = new Map();
	/** Reverse lookup: sub-agent character ID → parent info */
	subagentMeta: Map<number, { parentAgentId: number; parentToolId: string }> = new Map();
	private nextSubagentId = -1;
	/** ID of the agent currently using the gaming table, or null */
	gamingAgentId: number | null = null;
	/** Timer for periodic gaming availability checks */
	private gamingCheckTimer = 0;
	/** ID of the agent currently nuzzling the cat, or null */
	nuzzleAgentId: number | null = null;
	/** Timer for periodic nuzzle availability checks */
	private nuzzleCheckTimer = 0;
	/** ID of the agent currently getting a drink, or null */
	drinkAgentId: number | null = null;
	/** Timer for periodic drink availability checks */
	private drinkCheckTimer = 0;
	/** ID of the agent currently getting food, or null */
	foodAgentId: number | null = null;
	/** Timer for periodic food availability checks */
	private foodCheckTimer = 0;

	/** Walking cat that patrols between kitchen and lounge */
	walkingCat: WalkingCat;

	constructor(layout?: OfficeLayout) {
		this.layout = layout || createDefaultLayout();
		this.tileMap = layoutToTileMap(this.layout);
		this.seats = layoutToSeats(this.layout.furniture);
		this.blockedTiles = getBlockedTiles(this.layout.furniture);
		this.furniture = layoutToFurnitureInstances(this.layout.furniture);
		this.walkableTiles = getWalkableTiles(this.tileMap, this.blockedTiles);
		this.loungeWalkableTiles = this.walkableTiles.filter(
			(t) => t.row >= LOUNGE_ROW_START && t.col <= LOUNGE_COL_MAX,
		);

		// Initialize walking cat in the kitchen
		const catStart = CAT_WAYPOINTS[0];
		this.walkingCat = {
			x: catStart.col * TILE_SIZE + TILE_SIZE / 2,
			y: catStart.row * TILE_SIZE + TILE_SIZE / 2,
			tileCol: catStart.col,
			tileRow: catStart.row,
			path: [],
			moveProgress: 0,
			facingLeft: false,
			pauseTimer: CAT_PAUSE_MIN_SEC + Math.random() * (CAT_PAUSE_MAX_SEC - CAT_PAUSE_MIN_SEC),
			waypointIndex: 0,
		};
	}

	/** Rebuild all derived state from a new layout. Reassigns existing characters.
	 *  @param shift Optional pixel shift to apply when grid expands left/up */
	rebuildFromLayout(layout: OfficeLayout, shift?: { col: number; row: number }): void {
		// Cancel any active gaming session since layout is changing
		if (this.gamingAgentId !== null) {
			this.cancelGaming(this.gamingAgentId);
		}
		// Cancel any active nuzzle session since layout is changing
		if (this.nuzzleAgentId !== null) {
			this.cancelNuzzle(this.nuzzleAgentId);
		}
		// Cancel any active drink session since layout is changing
		if (this.drinkAgentId !== null) {
			this.cancelDrink(this.drinkAgentId);
		}
		// Cancel any active food session since layout is changing
		if (this.foodAgentId !== null) {
			this.cancelFood(this.foodAgentId);
		}
		this.layout = layout;
		this.tileMap = layoutToTileMap(layout);
		this.seats = layoutToSeats(layout.furniture);
		this.blockedTiles = getBlockedTiles(layout.furniture);
		this.rebuildFurnitureInstances();
		this.walkableTiles = getWalkableTiles(this.tileMap, this.blockedTiles);
		this.loungeWalkableTiles = this.walkableTiles.filter(
			(t) => t.row >= LOUNGE_ROW_START && t.col <= LOUNGE_COL_MAX,
		);

		// Shift character positions when grid expands left/up
		if (shift && (shift.col !== 0 || shift.row !== 0)) {
			for (const ch of this.characters.values()) {
				ch.tileCol += shift.col;
				ch.tileRow += shift.row;
				ch.x += shift.col * TILE_SIZE;
				ch.y += shift.row * TILE_SIZE;
				// Clear path since tile coords changed
				ch.path = [];
				ch.moveProgress = 0;
			}
		}

		// Reassign characters to new seats, preserving existing assignments when possible
		for (const seat of this.seats.values()) {
			seat.assigned = false;
		}

		// First pass: try to keep characters at their existing seats
		for (const ch of this.characters.values()) {
			if (ch.seatId && this.seats.has(ch.seatId)) {
				const seat = this.seats.get(ch.seatId)!;
				if (!seat.assigned) {
					seat.assigned = true;
					// Snap character to seat position
					ch.tileCol = seat.seatCol;
					ch.tileRow = seat.seatRow;
					const cx = seat.seatCol * TILE_SIZE + TILE_SIZE / 2;
					const cy = seat.seatRow * TILE_SIZE + TILE_SIZE / 2;
					ch.x = cx;
					ch.y = cy;
					ch.dir = seat.facingDir;
					continue;
				}
			}
			ch.seatId = null; // will be reassigned below
		}

		// Second pass: assign remaining characters to free seats
		for (const ch of this.characters.values()) {
			if (ch.seatId) continue;
			const seatId = this.findFreeSeat();
			if (seatId) {
				this.seats.get(seatId)!.assigned = true;
				ch.seatId = seatId;
				const seat = this.seats.get(seatId)!;
				ch.tileCol = seat.seatCol;
				ch.tileRow = seat.seatRow;
				ch.x = seat.seatCol * TILE_SIZE + TILE_SIZE / 2;
				ch.y = seat.seatRow * TILE_SIZE + TILE_SIZE / 2;
				ch.dir = seat.facingDir;
			}
		}

		// Relocate any characters that ended up outside bounds or on non-walkable tiles
		for (const ch of this.characters.values()) {
			if (ch.seatId) continue; // seated characters are fine
			if (
				ch.tileCol < 0 ||
				ch.tileCol >= layout.cols ||
				ch.tileRow < 0 ||
				ch.tileRow >= layout.rows
			) {
				this.relocateCharacterToWalkable(ch);
			}
		}
	}

	/** Move a character to a random walkable tile */
	private relocateCharacterToWalkable(ch: Character): void {
		if (this.walkableTiles.length === 0) return;
		const spawn = this.walkableTiles[Math.floor(Math.random() * this.walkableTiles.length)];
		ch.tileCol = spawn.col;
		ch.tileRow = spawn.row;
		ch.x = spawn.col * TILE_SIZE + TILE_SIZE / 2;
		ch.y = spawn.row * TILE_SIZE + TILE_SIZE / 2;
		ch.path = [];
		ch.moveProgress = 0;
	}

	getLayout(): OfficeLayout {
		return this.layout;
	}

	/** Get the blocked-tile key for a character's own seat, or null */
	private ownSeatKey(ch: Character): string | null {
		if (!ch.seatId) return null;
		const seat = this.seats.get(ch.seatId);
		if (!seat) return null;
		return `${seat.seatCol},${seat.seatRow}`;
	}

	/** Temporarily unblock a character's own seat, run fn, then re-block */
	private withOwnSeatUnblocked<T>(ch: Character, fn: () => T): T {
		const key = this.ownSeatKey(ch);
		if (key) this.blockedTiles.delete(key);
		const result = fn();
		if (key) this.blockedTiles.add(key);
		return result;
	}

	private findFreeSeat(): string | null {
		for (const [uid, seat] of this.seats) {
			if (!seat.assigned) return uid;
		}
		return null;
	}

	/**
	 * Pick a diverse palette for a new agent based on currently active agents.
	 * First 6 agents each get a unique skin (random order). Beyond 6, skins
	 * repeat in balanced rounds with a random hue shift (≥45°).
	 */
	private pickDiversePalette(): { palette: number; hueShift: number } {
		// Count how many non-sub-agents use each base palette (0-5)
		const counts = new Array(PALETTE_COUNT).fill(0) as number[];
		for (const ch of this.characters.values()) {
			if (ch.isSubagent) continue;
			counts[ch.palette]++;
		}
		const minCount = Math.min(...counts);
		// Available = palettes at the minimum count (least used)
		const available: number[] = [];
		for (let i = 0; i < PALETTE_COUNT; i++) {
			if (counts[i] === minCount) available.push(i);
		}
		const palette = available[Math.floor(Math.random() * available.length)];
		// First round (minCount === 0): no hue shift. Subsequent rounds: random ≥45°.
		let hueShift = 0;
		if (minCount > 0) {
			hueShift = HUE_SHIFT_MIN_DEG + Math.floor(Math.random() * HUE_SHIFT_RANGE_DEG);
		}
		return { palette, hueShift };
	}

	addAgent(
		id: number,
		preferredPalette?: number,
		preferredHueShift?: number,
		preferredSeatId?: string,
		skipSpawnEffect?: boolean,
		folderName?: string,
	): void {
		if (this.characters.has(id)) return;

		let palette: number;
		let hueShift: number;
		if (preferredPalette !== undefined) {
			palette = preferredPalette;
			hueShift = preferredHueShift ?? 0;
		} else {
			const pick = this.pickDiversePalette();
			palette = pick.palette;
			hueShift = pick.hueShift;
		}

		// Try preferred seat first, then any free seat
		let seatId: string | null = null;
		if (preferredSeatId && this.seats.has(preferredSeatId)) {
			const seat = this.seats.get(preferredSeatId)!;
			if (!seat.assigned) {
				seatId = preferredSeatId;
			}
		}
		if (!seatId) {
			seatId = this.findFreeSeat();
		}

		let ch: Character;
		if (seatId) {
			const seat = this.seats.get(seatId)!;
			seat.assigned = true;
			ch = createCharacter(id, palette, seatId, seat, hueShift);

			// Workers spawn at the entrance door, not at their desk.
			// They'll walk to their seat when setAgentActive(true) is called.
			if (!skipSpawnEffect) {
				const spawn = EXIT_TILES[Math.floor(Math.random() * EXIT_TILES.length)];
				ch.x = spawn.col * TILE_SIZE + TILE_SIZE / 2;
				ch.y = spawn.row * TILE_SIZE + TILE_SIZE / 2;
				ch.tileCol = spawn.col;
				ch.tileRow = spawn.row;
				ch.state = CharacterState.IDLE;
				ch.isActive = false;
			}
		} else {
			// No seats — spawn at random walkable tile
			const spawn =
				this.walkableTiles.length > 0
					? this.walkableTiles[Math.floor(Math.random() * this.walkableTiles.length)]
					: { col: 1, row: 1 };
			ch = createCharacter(id, palette, null, null, hueShift);
			ch.x = spawn.col * TILE_SIZE + TILE_SIZE / 2;
			ch.y = spawn.row * TILE_SIZE + TILE_SIZE / 2;
			ch.tileCol = spawn.col;
			ch.tileRow = spawn.row;
		}

		if (folderName) {
			ch.folderName = folderName;
		}
		if (!skipSpawnEffect) {
			ch.matrixEffect = "spawn";
			ch.matrixEffectTimer = 0;
			ch.matrixEffectSeeds = matrixEffectSeeds();
		}
		this.characters.set(id, ch);
		this.rebuildFurnitureInstances();
	}

	removeAgent(id: number): void {
		const ch = this.characters.get(id);
		if (!ch) return;
		if (ch.matrixEffect === "despawn" || ch.isLeaving) return; // already leaving/despawning
		// Cancel gaming if this agent was gaming
		if (ch.isGaming) this.cancelGaming(id);
		// Cancel nuzzle if this agent was nuzzling
		if (ch.isNuzzling) this.cancelNuzzle(id);
		// Cancel drink if this agent was drinking
		if (ch.isDrinking) this.cancelDrink(id);
		// Cancel food if this agent was eating
		if (ch.isEating) this.cancelFood(id);
		// Free seat and clear selection immediately
		if (ch.seatId) {
			const seat = this.seats.get(ch.seatId);
			if (seat) seat.assigned = false;
		}
		if (this.selectedAgentId === id) this.selectedAgentId = null;
		if (this.cameraFollowId === id) this.cameraFollowId = null;
		// Turn off screen immediately
		ch.isActive = false;
		ch.isLeaving = true;
		ch.seatTimer = 0;
		ch.bubbleType = null;
		this.rebuildFurnitureInstances();
		// Try to pathfind to an exit tile
		const exitPath = this.findExitPath(ch);
		if (exitPath && exitPath.length > 0) {
			ch.path = exitPath;
			ch.moveProgress = 0;
			ch.state = CharacterState.WALK;
			ch.frame = 0;
			ch.frameTimer = 0;
		} else {
			// No path to exit — immediate matrix despawn
			this.startDespawn(ch);
		}
	}

	/** Find a path from a character to the nearest reachable exit tile */
	private findExitPath(ch: Character): Array<{ col: number; row: number }> | null {
		let bestPath: Array<{ col: number; row: number }> | null = null;
		let bestLen = Infinity;
		for (const exit of EXIT_TILES) {
			const path = this.withOwnSeatUnblocked(ch, () =>
				findPath(ch.tileCol, ch.tileRow, exit.col, exit.row, this.tileMap, this.blockedTiles),
			);
			if (path.length > 0 && path.length < bestLen) {
				bestPath = path;
				bestLen = path.length;
			}
		}
		return bestPath;
	}

	/** Start the matrix despawn effect on a character */
	private startDespawn(ch: Character): void {
		ch.matrixEffect = "despawn";
		ch.matrixEffectTimer = 0;
		ch.matrixEffectSeeds = matrixEffectSeeds();
		ch.bubbleType = null;
	}

	/** Find seat uid at a given tile position, or null */
	getSeatAtTile(col: number, row: number): string | null {
		for (const [uid, seat] of this.seats) {
			if (seat.seatCol === col && seat.seatRow === row) return uid;
		}
		return null;
	}

	/** Reassign an agent from their current seat to a new seat */
	reassignSeat(agentId: number, seatId: string): void {
		const ch = this.characters.get(agentId);
		if (!ch) return;
		// Unassign old seat
		if (ch.seatId) {
			const old = this.seats.get(ch.seatId);
			if (old) old.assigned = false;
		}
		// Assign new seat
		const seat = this.seats.get(seatId);
		if (!seat || seat.assigned) return;
		seat.assigned = true;
		ch.seatId = seatId;
		// Pathfind to new seat (unblock own seat tile for this query)
		const path = this.withOwnSeatUnblocked(ch, () =>
			findPath(ch.tileCol, ch.tileRow, seat.seatCol, seat.seatRow, this.tileMap, this.blockedTiles),
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
			if (!ch.isActive) {
				ch.seatTimer = INACTIVE_SEAT_TIMER_MIN_SEC + Math.random() * INACTIVE_SEAT_TIMER_RANGE_SEC;
			}
		}
	}

	/** Send an agent back to their currently assigned seat */
	sendToSeat(agentId: number): void {
		const ch = this.characters.get(agentId);
		if (!ch || !ch.seatId) return;
		const seat = this.seats.get(ch.seatId);
		if (!seat) return;
		const path = this.withOwnSeatUnblocked(ch, () =>
			findPath(ch.tileCol, ch.tileRow, seat.seatCol, seat.seatRow, this.tileMap, this.blockedTiles),
		);
		if (path.length > 0) {
			ch.path = path;
			ch.moveProgress = 0;
			ch.state = CharacterState.WALK;
			ch.frame = 0;
			ch.frameTimer = 0;
		} else {
			// Already at seat — sit down
			ch.state = CharacterState.TYPE;
			ch.dir = seat.facingDir;
			ch.frame = 0;
			ch.frameTimer = 0;
			if (!ch.isActive) {
				ch.seatTimer = INACTIVE_SEAT_TIMER_MIN_SEC + Math.random() * INACTIVE_SEAT_TIMER_RANGE_SEC;
			}
		}
	}

	/** Walk an agent to an arbitrary walkable tile (right-click command) */
	walkToTile(agentId: number, col: number, row: number): boolean {
		const ch = this.characters.get(agentId);
		if (!ch || ch.isSubagent) return false;
		if (!isWalkable(col, row, this.tileMap, this.blockedTiles)) {
			// Also allow walking to own seat tile (blocked for others but not self)
			const key = this.ownSeatKey(ch);
			if (!key || key !== `${col},${row}`) return false;
		}
		const path = this.withOwnSeatUnblocked(ch, () =>
			findPath(ch.tileCol, ch.tileRow, col, row, this.tileMap, this.blockedTiles),
		);
		if (path.length === 0) return false;
		ch.path = path;
		ch.moveProgress = 0;
		ch.state = CharacterState.WALK;
		ch.frame = 0;
		ch.frameTimer = 0;
		return true;
	}

	/** Create a sub-agent character with the parent's palette. Returns the sub-agent ID. */
	addSubagent(parentAgentId: number, parentToolId: string): number {
		const key = `${parentAgentId}:${parentToolId}`;
		if (this.subagentIdMap.has(key)) return this.subagentIdMap.get(key)!;

		const id = this.nextSubagentId--;
		const parentCh = this.characters.get(parentAgentId);
		const palette = parentCh ? parentCh.palette : 0;
		const hueShift = parentCh ? parentCh.hueShift : 0;

		// Find the free seat closest to the parent agent
		const parentCol = parentCh ? parentCh.tileCol : 0;
		const parentRow = parentCh ? parentCh.tileRow : 0;
		const dist = (c: number, r: number) => Math.abs(c - parentCol) + Math.abs(r - parentRow);

		let bestSeatId: string | null = null;
		let bestDist = Infinity;
		for (const [uid, seat] of this.seats) {
			if (!seat.assigned) {
				const d = dist(seat.seatCol, seat.seatRow);
				if (d < bestDist) {
					bestDist = d;
					bestSeatId = uid;
				}
			}
		}

		let ch: Character;
		if (bestSeatId) {
			const seat = this.seats.get(bestSeatId)!;
			seat.assigned = true;
			ch = createCharacter(id, palette, bestSeatId, seat, hueShift);
		} else {
			// No seats — spawn at closest walkable tile to parent
			let spawn = { col: 1, row: 1 };
			if (this.walkableTiles.length > 0) {
				let closest = this.walkableTiles[0];
				let closestDist = dist(closest.col, closest.row);
				for (let i = 1; i < this.walkableTiles.length; i++) {
					const d = dist(this.walkableTiles[i].col, this.walkableTiles[i].row);
					if (d < closestDist) {
						closest = this.walkableTiles[i];
						closestDist = d;
					}
				}
				spawn = closest;
			}
			ch = createCharacter(id, palette, null, null, hueShift);
			ch.x = spawn.col * TILE_SIZE + TILE_SIZE / 2;
			ch.y = spawn.row * TILE_SIZE + TILE_SIZE / 2;
			ch.tileCol = spawn.col;
			ch.tileRow = spawn.row;
		}
		ch.isSubagent = true;
		ch.parentAgentId = parentAgentId;
		ch.matrixEffect = "spawn";
		ch.matrixEffectTimer = 0;
		ch.matrixEffectSeeds = matrixEffectSeeds();
		this.characters.set(id, ch);

		this.subagentIdMap.set(key, id);
		this.subagentMeta.set(id, { parentAgentId, parentToolId });
		return id;
	}

	/** Remove a specific sub-agent character and free its seat */
	removeSubagent(parentAgentId: number, parentToolId: string): void {
		const key = `${parentAgentId}:${parentToolId}`;
		const id = this.subagentIdMap.get(key);
		if (id === undefined) return;

		const ch = this.characters.get(id);
		if (ch) {
			if (ch.matrixEffect === "despawn") {
				// Already despawning — just clean up maps
				this.subagentIdMap.delete(key);
				this.subagentMeta.delete(id);
				return;
			}
			if (ch.seatId) {
				const seat = this.seats.get(ch.seatId);
				if (seat) seat.assigned = false;
			}
			// Turn off screen immediately
			ch.isActive = false;
			// Start despawn animation — keep character in map for rendering
			ch.matrixEffect = "despawn";
			ch.matrixEffectTimer = 0;
			ch.matrixEffectSeeds = matrixEffectSeeds();
			ch.bubbleType = null;
		}
		// Clean up tracking maps immediately so keys don't collide
		this.subagentIdMap.delete(key);
		this.subagentMeta.delete(id);
		if (this.selectedAgentId === id) this.selectedAgentId = null;
		if (this.cameraFollowId === id) this.cameraFollowId = null;
		this.rebuildFurnitureInstances();
	}

	/** Remove all sub-agents belonging to a parent agent */
	removeAllSubagents(parentAgentId: number): void {
		const toRemove: string[] = [];
		let anyRemoved = false;
		for (const [key, id] of this.subagentIdMap) {
			const meta = this.subagentMeta.get(id);
			if (meta && meta.parentAgentId === parentAgentId) {
				const ch = this.characters.get(id);
				if (ch) {
					if (ch.matrixEffect === "despawn") {
						// Already despawning — just clean up maps
						this.subagentMeta.delete(id);
						toRemove.push(key);
						continue;
					}
					if (ch.seatId) {
						const seat = this.seats.get(ch.seatId);
						if (seat) seat.assigned = false;
					}
					// Turn off screen immediately
					ch.isActive = false;
					anyRemoved = true;
					// Start despawn animation
					ch.matrixEffect = "despawn";
					ch.matrixEffectTimer = 0;
					ch.matrixEffectSeeds = matrixEffectSeeds();
					ch.bubbleType = null;
				}
				this.subagentMeta.delete(id);
				if (this.selectedAgentId === id) this.selectedAgentId = null;
				if (this.cameraFollowId === id) this.cameraFollowId = null;
				toRemove.push(key);
			}
		}
		for (const key of toRemove) {
			this.subagentIdMap.delete(key);
		}
		if (anyRemoved) this.rebuildFurnitureInstances();
	}

	/** Look up the sub-agent character ID for a given parent+toolId, or null */
	getSubagentId(parentAgentId: number, parentToolId: string): number | null {
		return this.subagentIdMap.get(`${parentAgentId}:${parentToolId}`) ?? null;
	}

	setAgentActive(id: number, active: boolean): void {
		const ch = this.characters.get(id);
		if (ch) {
			// Cancel gaming if agent becomes active
			if (active && ch.isGaming) {
				this.cancelGaming(id);
			}
			// Cancel nuzzle if agent becomes active
			if (active && ch.isNuzzling) {
				this.cancelNuzzle(id);
			}
			// Cancel drink if agent becomes active
			if (active && ch.isDrinking) {
				this.cancelDrink(id);
			}
			// Cancel food if agent becomes active
			if (active && ch.isEating) {
				this.cancelFood(id);
			}
			ch.isActive = active;
			if (!active) {
				// Sentinel -1: signals turn just ended, skip next seat rest timer.
				// Prevents the WALK handler from setting a 2-4 min rest on arrival.
				ch.seatTimer = -1;
				ch.path = [];
				ch.moveProgress = 0;
			}
			this.rebuildFurnitureInstances();
		}
	}

	/** Rebuild furniture instances with auto-state applied (active agents turn electronics ON) */
	private rebuildFurnitureInstances(): void {
		// Collect tiles where active agents face desks
		const autoOnTiles = new Set<string>();
		for (const ch of this.characters.values()) {
			if (!ch.isActive || !ch.seatId) continue;
			const seat = this.seats.get(ch.seatId);
			if (!seat) continue;
			// Find the desk tile(s) the agent faces from their seat
			const dCol =
				seat.facingDir === Direction.RIGHT ? 1 : seat.facingDir === Direction.LEFT ? -1 : 0;
			const dRow = seat.facingDir === Direction.DOWN ? 1 : seat.facingDir === Direction.UP ? -1 : 0;
			// Check tiles in the facing direction (desk could be 1-3 tiles deep)
			for (let d = 1; d <= AUTO_ON_FACING_DEPTH; d++) {
				const tileCol = seat.seatCol + dCol * d;
				const tileRow = seat.seatRow + dRow * d;
				autoOnTiles.add(`${tileCol},${tileRow}`);
			}
			// Also check tiles to the sides of the facing direction (desks can be wide)
			for (let d = 1; d <= AUTO_ON_SIDE_DEPTH; d++) {
				const baseCol = seat.seatCol + dCol * d;
				const baseRow = seat.seatRow + dRow * d;
				if (dCol !== 0) {
					// Facing left/right: check tiles above and below
					autoOnTiles.add(`${baseCol},${baseRow - 1}`);
					autoOnTiles.add(`${baseCol},${baseRow + 1}`);
				} else {
					// Facing up/down: check tiles left and right
					autoOnTiles.add(`${baseCol - 1},${baseRow}`);
					autoOnTiles.add(`${baseCol + 1},${baseRow}`);
				}
			}
		}

		// Gaming table: force ON when gaming, force OFF when not
		const gamingIsActive =
			this.gamingAgentId !== null && this.characters.get(this.gamingAgentId)?.isGaming === true;
		if (gamingIsActive) {
			// Add tiles in the facing direction (UP) from the gaming standing position
			for (let d = 1; d <= AUTO_ON_FACING_DEPTH; d++) {
				autoOnTiles.add(`${GAMING_STAND_COL},${GAMING_STAND_ROW - d}`);
			}
			for (let d = 1; d <= AUTO_ON_SIDE_DEPTH; d++) {
				autoOnTiles.add(`${GAMING_STAND_COL - 1},${GAMING_STAND_ROW - d}`);
				autoOnTiles.add(`${GAMING_STAND_COL + 1},${GAMING_STAND_ROW - d}`);
			}
		}
		// Tiles to force OFF (gaming table electronics when no one is gaming)
		const autoOffTiles = new Set<string>();
		if (!gamingIsActive) {
			for (let d = 1; d <= AUTO_ON_FACING_DEPTH; d++) {
				autoOffTiles.add(`${GAMING_STAND_COL},${GAMING_STAND_ROW - d}`);
			}
			for (let d = 1; d <= AUTO_ON_SIDE_DEPTH; d++) {
				autoOffTiles.add(`${GAMING_STAND_COL - 1},${GAMING_STAND_ROW - d}`);
				autoOffTiles.add(`${GAMING_STAND_COL + 1},${GAMING_STAND_ROW - d}`);
			}
		}

		if (autoOnTiles.size === 0 && autoOffTiles.size === 0) {
			this.furniture = layoutToFurnitureInstances(this.layout.furniture);
			return;
		}

		// Build modified furniture list with auto-state applied
		const modifiedFurniture: PlacedFurniture[] = this.layout.furniture.map((item) => {
			const entry = getCatalogEntry(item.type);
			if (!entry) return item;
			// Check if any tile of this furniture overlaps an auto-on tile
			for (let dr = 0; dr < entry.footprintH; dr++) {
				for (let dc = 0; dc < entry.footprintW; dc++) {
					const key = `${item.col + dc},${item.row + dr}`;
					if (autoOnTiles.has(key)) {
						const onType = getOnStateType(item.type);
						if (onType !== item.type) {
							return { ...item, type: onType };
						}
						return item;
					}
					if (autoOffTiles.has(key)) {
						const offType = getOffStateType(item.type);
						if (offType !== item.type) {
							return { ...item, type: offType };
						}
						return item;
					}
				}
			}
			return item;
		});

		this.furniture = layoutToFurnitureInstances(modifiedFurniture);
	}

	setAgentTool(id: number, tool: string | null): void {
		const ch = this.characters.get(id);
		if (ch) {
			ch.currentTool = tool;
		}
	}

	showPermissionBubble(id: number): void {
		const ch = this.characters.get(id);
		if (ch) {
			ch.bubbleType = "permission";
			ch.bubbleTimer = 0;
		}
	}

	clearPermissionBubble(id: number): void {
		const ch = this.characters.get(id);
		if (ch && ch.bubbleType === "permission") {
			ch.bubbleType = null;
			ch.bubbleTimer = 0;
		}
	}

	showWaitingBubble(id: number): void {
		const ch = this.characters.get(id);
		if (ch) {
			ch.bubbleType = "waiting";
			ch.bubbleTimer = WAITING_BUBBLE_DURATION_SEC;
		}
	}

	/** Dismiss bubble on click — permission: instant, waiting: quick fade */
	dismissBubble(id: number): void {
		const ch = this.characters.get(id);
		if (!ch || !ch.bubbleType) return;
		if (ch.bubbleType === "permission") {
			ch.bubbleType = null;
			ch.bubbleTimer = 0;
		} else if (ch.bubbleType === "waiting") {
			// Trigger immediate fade (0.3s remaining)
			ch.bubbleTimer = Math.min(ch.bubbleTimer, DISMISS_BUBBLE_FAST_FADE_SEC);
		}
	}

	private updateWalkingCat(dt: number): void {
		const cat = this.walkingCat;

		if (cat.path.length === 0) {
			// Pausing — wait before picking next waypoint
			cat.pauseTimer -= dt;
			if (cat.pauseTimer <= 0) {
				cat.waypointIndex = (cat.waypointIndex + 1) % CAT_WAYPOINTS.length;
				const target = CAT_WAYPOINTS[cat.waypointIndex];
				const path = findPath(
					cat.tileCol,
					cat.tileRow,
					target.col,
					target.row,
					this.tileMap,
					this.blockedTiles,
				);
				if (path.length > 0) {
					cat.path = path;
					cat.moveProgress = 0;
				}
				cat.pauseTimer =
					CAT_PAUSE_MIN_SEC + Math.random() * (CAT_PAUSE_MAX_SEC - CAT_PAUSE_MIN_SEC);
			}
			return;
		}

		// Walking along path
		const nextTile = cat.path[0];
		const dc = nextTile.col - cat.tileCol;
		if (dc < 0) cat.facingLeft = true;
		else if (dc > 0) cat.facingLeft = false;

		cat.moveProgress += (CAT_WALK_SPEED_PX_PER_SEC / TILE_SIZE) * dt;

		const fromX = cat.tileCol * TILE_SIZE + TILE_SIZE / 2;
		const fromY = cat.tileRow * TILE_SIZE + TILE_SIZE / 2;
		const toX = nextTile.col * TILE_SIZE + TILE_SIZE / 2;
		const toY = nextTile.row * TILE_SIZE + TILE_SIZE / 2;
		const t = Math.min(cat.moveProgress, 1);
		cat.x = fromX + (toX - fromX) * t;
		cat.y = fromY + (toY - fromY) * t;

		if (cat.moveProgress >= 1) {
			cat.tileCol = nextTile.col;
			cat.tileRow = nextTile.row;
			cat.x = toX;
			cat.y = toY;
			cat.path.shift();
			cat.moveProgress = 0;
		}
	}

	/** Try to pick an idle agent to start gaming at the gaming table */
	private tryStartGaming(): void {
		if (this.gamingAgentId !== null) return;

		// Check the gaming tile is walkable (layout might have changed)
		if (!isWalkable(GAMING_STAND_COL, GAMING_STAND_ROW, this.tileMap, this.blockedTiles)) {
			console.log(
				"[gaming] tile (%d,%d) not walkable, skipping",
				GAMING_STAND_COL,
				GAMING_STAND_ROW,
			);
			return;
		}

		// Find idle, inactive, non-sub-agent characters that could game
		const candidates: Character[] = [];
		for (const ch of this.characters.values()) {
			if (
				!ch.isActive &&
				!ch.isSubagent &&
				!ch.isLeaving &&
				!ch.isGaming &&
				ch.state === CharacterState.IDLE &&
				ch.path.length === 0 &&
				!ch.matrixEffect
			) {
				candidates.push(ch);
			}
		}
		if (candidates.length === 0) {
			console.log("[gaming] no idle candidates");
			return;
		}
		const roll = Math.random();
		if (roll > GAMING_CHANCE) {
			console.log(
				"[gaming] roll %.2f > %.2f chance, skipping (%d candidates)",
				roll,
				GAMING_CHANCE,
				candidates.length,
			);
			return;
		}
		console.log(
			"[gaming] roll %.2f <= %.2f chance, picking from %d candidates",
			roll,
			GAMING_CHANCE,
			candidates.length,
		);

		const chosen = candidates[Math.floor(Math.random() * candidates.length)];
		const path = this.withOwnSeatUnblocked(chosen, () =>
			findPath(
				chosen.tileCol,
				chosen.tileRow,
				GAMING_STAND_COL,
				GAMING_STAND_ROW,
				this.tileMap,
				this.blockedTiles,
			),
		);
		if (path.length === 0) {
			console.log("[gaming] agent %d: no path to gaming tile", chosen.id);
			return;
		}

		chosen.isGaming = true;
		chosen.gamingTimer =
			GAMING_DURATION_MIN_SEC + Math.random() * (GAMING_DURATION_MAX_SEC - GAMING_DURATION_MIN_SEC);
		chosen.path = path;
		chosen.moveProgress = 0;
		chosen.state = CharacterState.WALK;
		chosen.frame = 0;
		chosen.frameTimer = 0;
		// Clear coffee bubble since they're leaving the lounge to game
		if (chosen.bubbleType === "coffee") {
			chosen.bubbleType = null;
			chosen.bubbleTimer = 0;
		}
		this.gamingAgentId = chosen.id;
		console.log(
			"[gaming] agent %d walking to game table (%.0fs timer, %d steps)",
			chosen.id,
			chosen.gamingTimer,
			path.length,
		);
	}

	/** Cancel gaming for a specific agent */
	private cancelGaming(agentId: number): void {
		if (this.gamingAgentId !== agentId) return;
		console.log("[gaming] agent %d: gaming cancelled", agentId);
		const ch = this.characters.get(agentId);
		if (ch) {
			ch.isGaming = false;
			ch.gamingTimer = 0;
			if (ch.bubbleType === "gaming") {
				ch.bubbleType = null;
				ch.bubbleTimer = 0;
			}
		}
		this.gamingAgentId = null;
		this.rebuildFurnitureInstances();
	}

	/** Stop the current gaming agent and return them to wandering */
	private stopGaming(): void {
		if (this.gamingAgentId === null) return;
		console.log("[gaming] agent %d: done playing, returning to wander", this.gamingAgentId);
		const ch = this.characters.get(this.gamingAgentId);
		if (ch) {
			ch.isGaming = false;
			ch.gamingTimer = 0;
			ch.state = CharacterState.IDLE;
			ch.frame = 0;
			ch.frameTimer = 0;
			ch.bubbleType = null;
			ch.bubbleTimer = 0;
			// Reset wander timer so they start wandering soon
			ch.wanderTimer = 2 + Math.random() * 5;
		}
		this.gamingAgentId = null;
		this.rebuildFurnitureInstances();
	}

	// ── Nuzzle Cat logic ─────────────────────────────────────

	/** Find the position of the MISTRAL_CAT furniture in the current layout */
	private findCatPosition(): { col: number; row: number } | null {
		for (const item of this.layout.furniture) {
			if (item.type === FurnitureType.MISTRAL_CAT) {
				return { col: item.col, row: item.row };
			}
		}
		return null;
	}

	/** Find a walkable tile adjacent to the cat and the direction to face it */
	private findCatAdjacentTile(): { col: number; row: number; facingDir: 0 | 1 | 2 | 3 } | null {
		const catPos = this.findCatPosition();
		if (!catPos) return null;

		// Check all 4 neighbors of the cat tile
		const neighbors: Array<{ col: number; row: number; facingDir: 0 | 1 | 2 | 3 }> = [
			{ col: catPos.col, row: catPos.row + 1, facingDir: Direction.UP as 0 | 1 | 2 | 3 },
			{ col: catPos.col, row: catPos.row - 1, facingDir: Direction.DOWN as 0 | 1 | 2 | 3 },
			{ col: catPos.col - 1, row: catPos.row, facingDir: Direction.RIGHT as 0 | 1 | 2 | 3 },
			{ col: catPos.col + 1, row: catPos.row, facingDir: Direction.LEFT as 0 | 1 | 2 | 3 },
		];

		for (const n of neighbors) {
			if (isWalkable(n.col, n.row, this.tileMap, this.blockedTiles)) {
				return n;
			}
		}
		return null;
	}

	/** Try to pick an idle agent to nuzzle the cat */
	private tryStartNuzzle(): void {
		if (this.nuzzleAgentId !== null) return;

		const adjacent = this.findCatAdjacentTile();
		if (!adjacent) return;

		// Find idle, inactive, non-sub-agent characters that could nuzzle
		const candidates: Character[] = [];
		for (const ch of this.characters.values()) {
			if (
				!ch.isActive &&
				!ch.isSubagent &&
				!ch.isLeaving &&
				!ch.isGaming &&
				!ch.isNuzzling &&
				ch.state === CharacterState.IDLE &&
				ch.path.length === 0 &&
				!ch.matrixEffect
			) {
				candidates.push(ch);
			}
		}
		if (candidates.length === 0) return;

		if (Math.random() > NUZZLE_CHANCE) return;

		const chosen = candidates[Math.floor(Math.random() * candidates.length)];
		const path = this.withOwnSeatUnblocked(chosen, () =>
			findPath(
				chosen.tileCol,
				chosen.tileRow,
				adjacent.col,
				adjacent.row,
				this.tileMap,
				this.blockedTiles,
			),
		);
		if (path.length === 0) return;

		chosen.isNuzzling = true;
		chosen.nuzzleTimer = NUZZLE_HAND_DURATION_SEC + NUZZLE_HEART_DURATION_SEC;
		chosen.path = path;
		chosen.moveProgress = 0;
		chosen.state = CharacterState.WALK;
		chosen.frame = 0;
		chosen.frameTimer = 0;
		// Clear coffee bubble since they're leaving the lounge to nuzzle
		if (chosen.bubbleType === "coffee") {
			chosen.bubbleType = null;
			chosen.bubbleTimer = 0;
		}
		this.nuzzleAgentId = chosen.id;
	}

	/** Cancel nuzzle for a specific agent */
	private cancelNuzzle(agentId: number): void {
		if (this.nuzzleAgentId !== agentId) return;
		const ch = this.characters.get(agentId);
		if (ch) {
			ch.isNuzzling = false;
			ch.nuzzleTimer = 0;
			if (ch.bubbleType === "hand" || ch.bubbleType === "heart") {
				ch.bubbleType = null;
				ch.bubbleTimer = 0;
			}
		}
		this.nuzzleAgentId = null;
	}

	/** Stop the current nuzzle and return agent to wandering */
	private stopNuzzle(): void {
		if (this.nuzzleAgentId === null) return;
		const ch = this.characters.get(this.nuzzleAgentId);
		if (ch) {
			ch.isNuzzling = false;
			ch.nuzzleTimer = 0;
			ch.state = CharacterState.IDLE;
			ch.frame = 0;
			ch.frameTimer = 0;
			ch.bubbleType = null;
			ch.bubbleTimer = 0;
			ch.wanderTimer = 2 + Math.random() * 5;
		}
		this.nuzzleAgentId = null;
	}

	// ── Drink (water dispenser) logic ────────────────────────

	/** Find a walkable tile adjacent to a furniture item and the direction to face it.
	 *  Accounts for furniture footprint so multi-tile items (e.g. 2×2 fridge) work correctly. */
	private findAdjacentTile(
		furnitureType: string,
	): { col: number; row: number; facingDir: 0 | 1 | 2 | 3 } | null {
		let item: { col: number; row: number } | null = null;
		let fw = 1;
		let fh = 1;
		for (const f of this.layout.furniture) {
			if (f.type === furnitureType) {
				item = { col: f.col, row: f.row };
				const entry = getCatalogEntry(f.type);
				if (entry) {
					fw = entry.footprintW;
					fh = entry.footprintH;
				}
				break;
			}
		}
		if (!item) return null;
		// Collect all tiles adjacent to the footprint (not inside it)
		const occupied = new Set<string>();
		for (let dc = 0; dc < fw; dc++) {
			for (let dr = 0; dr < fh; dr++) {
				occupied.add(`${item.col + dc},${item.row + dr}`);
			}
		}
		const neighbors: Array<{ col: number; row: number; facingDir: 0 | 1 | 2 | 3 }> = [];
		// Bottom edge (facing UP toward furniture)
		for (let dc = 0; dc < fw; dc++) {
			neighbors.push({
				col: item.col + dc,
				row: item.row + fh,
				facingDir: Direction.UP as 0 | 1 | 2 | 3,
			});
		}
		// Top edge (facing DOWN toward furniture)
		for (let dc = 0; dc < fw; dc++) {
			neighbors.push({
				col: item.col + dc,
				row: item.row - 1,
				facingDir: Direction.DOWN as 0 | 1 | 2 | 3,
			});
		}
		// Left edge (facing RIGHT toward furniture)
		for (let dr = 0; dr < fh; dr++) {
			neighbors.push({
				col: item.col - 1,
				row: item.row + dr,
				facingDir: Direction.RIGHT as 0 | 1 | 2 | 3,
			});
		}
		// Right edge (facing LEFT toward furniture)
		for (let dr = 0; dr < fh; dr++) {
			neighbors.push({
				col: item.col + fw,
				row: item.row + dr,
				facingDir: Direction.LEFT as 0 | 1 | 2 | 3,
			});
		}
		for (const n of neighbors) {
			if (
				!occupied.has(`${n.col},${n.row}`) &&
				isWalkable(n.col, n.row, this.tileMap, this.blockedTiles)
			) {
				return n;
			}
		}
		return null;
	}

	/** Collect idle candidates for an interaction (not doing anything else) */
	private getIdleCandidates(): Character[] {
		const candidates: Character[] = [];
		for (const ch of this.characters.values()) {
			if (
				!ch.isActive &&
				!ch.isSubagent &&
				!ch.isLeaving &&
				!ch.isGaming &&
				!ch.isNuzzling &&
				!ch.isDrinking &&
				!ch.isEating &&
				ch.state === CharacterState.IDLE &&
				ch.path.length === 0 &&
				!ch.matrixEffect
			) {
				candidates.push(ch);
			}
		}
		return candidates;
	}

	private tryStartDrink(): void {
		if (this.drinkAgentId !== null) return;
		const adjacent = this.findAdjacentTile(FurnitureType.WATER_DISPENSER);
		if (!adjacent) return;

		const candidates = this.getIdleCandidates();
		if (candidates.length === 0) return;
		const roll = Math.random();
		if (roll > DRINK_CHANCE) {
			console.log(
				"[drink] roll %.2f > %.2f chance, skipping (%d candidates)",
				roll,
				DRINK_CHANCE,
				candidates.length,
			);
			return;
		}
		console.log(
			"[drink] roll %.2f <= %.2f chance, picking from %d candidates",
			roll,
			DRINK_CHANCE,
			candidates.length,
		);

		const chosen = candidates[Math.floor(Math.random() * candidates.length)];
		const path = this.withOwnSeatUnblocked(chosen, () =>
			findPath(
				chosen.tileCol,
				chosen.tileRow,
				adjacent.col,
				adjacent.row,
				this.tileMap,
				this.blockedTiles,
			),
		);
		if (path.length === 0) {
			console.log("[drink] agent %d: no path to dispenser", chosen.id);
			return;
		}

		chosen.isDrinking = true;
		chosen.drinkTimer = DRINK_DURATION_SEC;
		chosen.path = path;
		chosen.moveProgress = 0;
		chosen.state = CharacterState.WALK;
		chosen.frame = 0;
		chosen.frameTimer = 0;
		if (chosen.bubbleType === "coffee") {
			chosen.bubbleType = null;
			chosen.bubbleTimer = 0;
		}
		this.drinkAgentId = chosen.id;
		console.log(
			"[drink] agent %d walking to dispenser (%.0fs timer, %d steps)",
			chosen.id,
			chosen.drinkTimer,
			path.length,
		);
	}

	private cancelDrink(agentId: number): void {
		if (this.drinkAgentId !== agentId) return;
		console.log("[drink] agent %d: cancelled", agentId);
		const ch = this.characters.get(agentId);
		if (ch) {
			ch.isDrinking = false;
			ch.drinkTimer = 0;
			if (ch.bubbleType === "drink") {
				ch.bubbleType = null;
				ch.bubbleTimer = 0;
			}
		}
		this.drinkAgentId = null;
	}

	private stopDrink(): void {
		if (this.drinkAgentId === null) return;
		console.log("[drink] agent %d: done drinking, returning to wander", this.drinkAgentId);
		const ch = this.characters.get(this.drinkAgentId);
		if (ch) {
			ch.isDrinking = false;
			ch.drinkTimer = 0;
			ch.state = CharacterState.IDLE;
			ch.frame = 0;
			ch.frameTimer = 0;
			ch.bubbleType = null;
			ch.bubbleTimer = 0;
			ch.wanderTimer = 2 + Math.random() * 5;
		}
		this.drinkAgentId = null;
	}

	// ── Food (fridge) logic ─────────────────────────────────

	private tryStartFood(): void {
		if (this.foodAgentId !== null) return;
		const adjacent = this.findAdjacentTile(FurnitureType.COOLER);
		if (!adjacent) return;

		const candidates = this.getIdleCandidates();
		if (candidates.length === 0) return;
		const roll = Math.random();
		if (roll > FOOD_CHANCE) {
			console.log(
				"[food] roll %.2f > %.2f chance, skipping (%d candidates)",
				roll,
				FOOD_CHANCE,
				candidates.length,
			);
			return;
		}
		console.log(
			"[food] roll %.2f <= %.2f chance, picking from %d candidates",
			roll,
			FOOD_CHANCE,
			candidates.length,
		);

		const chosen = candidates[Math.floor(Math.random() * candidates.length)];
		const path = this.withOwnSeatUnblocked(chosen, () =>
			findPath(
				chosen.tileCol,
				chosen.tileRow,
				adjacent.col,
				adjacent.row,
				this.tileMap,
				this.blockedTiles,
			),
		);
		if (path.length === 0) {
			console.log("[food] agent %d: no path to fridge", chosen.id);
			return;
		}

		chosen.isEating = true;
		chosen.eatTimer = FOOD_DURATION_SEC;
		chosen.path = path;
		chosen.moveProgress = 0;
		chosen.state = CharacterState.WALK;
		chosen.frame = 0;
		chosen.frameTimer = 0;
		if (chosen.bubbleType === "coffee") {
			chosen.bubbleType = null;
			chosen.bubbleTimer = 0;
		}
		this.foodAgentId = chosen.id;
		console.log(
			"[food] agent %d walking to fridge (%.0fs timer, %d steps)",
			chosen.id,
			chosen.eatTimer,
			path.length,
		);
	}

	private cancelFood(agentId: number): void {
		if (this.foodAgentId !== agentId) return;
		console.log("[food] agent %d: cancelled", agentId);
		const ch = this.characters.get(agentId);
		if (ch) {
			ch.isEating = false;
			ch.eatTimer = 0;
			if (ch.bubbleType === "food") {
				ch.bubbleType = null;
				ch.bubbleTimer = 0;
			}
		}
		this.foodAgentId = null;
	}

	private stopFood(): void {
		if (this.foodAgentId === null) return;
		console.log("[food] agent %d: done eating, returning to wander", this.foodAgentId);
		const ch = this.characters.get(this.foodAgentId);
		if (ch) {
			ch.isEating = false;
			ch.eatTimer = 0;
			ch.state = CharacterState.IDLE;
			ch.frame = 0;
			ch.frameTimer = 0;
			ch.bubbleType = null;
			ch.bubbleTimer = 0;
			ch.wanderTimer = 2 + Math.random() * 5;
		}
		this.foodAgentId = null;
	}

	update(dt: number): void {
		this.updateWalkingCat(dt);
		const toDelete: number[] = [];
		for (const ch of this.characters.values()) {
			// Handle matrix effect animation
			if (ch.matrixEffect) {
				ch.matrixEffectTimer += dt;
				if (ch.matrixEffectTimer >= MATRIX_EFFECT_DURATION) {
					if (ch.matrixEffect === "spawn") {
						// Spawn complete — clear effect, resume normal FSM
						ch.matrixEffect = null;
						ch.matrixEffectTimer = 0;
						ch.matrixEffectSeeds = [];
					} else {
						// Despawn complete — mark for deletion
						toDelete.push(ch.id);
					}
				}
				continue; // skip normal FSM while effect is active
			}

			// Temporarily unblock own seat so character can pathfind to it
			this.withOwnSeatUnblocked(ch, () =>
				updateCharacter(
					ch,
					dt,
					this.walkableTiles,
					this.seats,
					this.tileMap,
					this.blockedTiles,
					this.loungeWalkableTiles,
				),
			);

			// Check if a leaving character has arrived at exit — trigger despawn
			if (ch.isLeaving && ch.path.length === 0 && ch.state !== CharacterState.WALK) {
				this.startDespawn(ch);
			}

			// Tick bubble timer for waiting bubbles
			if (ch.bubbleType === "waiting") {
				ch.bubbleTimer -= dt;
				if (ch.bubbleTimer <= 0) {
					ch.bubbleType = null;
					ch.bubbleTimer = 0;
				}
			}
		}
		// ── Gaming table logic ──────────────────────────────────
		// Handle gaming agent: check arrival, tick timer, manage state
		if (this.gamingAgentId !== null) {
			const gamingCh = this.characters.get(this.gamingAgentId);
			if (!gamingCh || gamingCh.isLeaving || gamingCh.matrixEffect) {
				// Agent was removed or is despawning — cancel gaming
				console.log("[gaming] agent %d: lost (removed/leaving/despawning)", this.gamingAgentId);
				if (gamingCh) {
					gamingCh.isGaming = false;
					gamingCh.gamingTimer = 0;
				}
				this.gamingAgentId = null;
				this.rebuildFurnitureInstances();
			} else if (gamingCh.isGaming) {
				// Check if gaming agent has arrived at the gaming position
				if (
					gamingCh.state === CharacterState.IDLE &&
					gamingCh.path.length === 0 &&
					gamingCh.tileCol === GAMING_STAND_COL &&
					gamingCh.tileRow === GAMING_STAND_ROW
				) {
					// Arrived — sit down and play
					console.log(
						"[gaming] agent %d: arrived at game table, playing for %.0fs",
						gamingCh.id,
						gamingCh.gamingTimer,
					);
					gamingCh.state = CharacterState.TYPE;
					gamingCh.dir = GAMING_FACE_DIR as 0 | 1 | 2 | 3;
					gamingCh.frame = 0;
					gamingCh.frameTimer = 0;
					gamingCh.bubbleType = "gaming";
					gamingCh.bubbleTimer = 0;
					this.rebuildFurnitureInstances();
				}
				// Tick gaming timer while playing (TYPE state at gaming position)
				if (gamingCh.state === CharacterState.TYPE && gamingCh.isGaming) {
					gamingCh.gamingTimer -= dt;
					if (gamingCh.gamingTimer <= 0) {
						this.stopGaming();
					}
				}
			}
		}

		// Periodically check if an idle agent should start gaming
		if (this.gamingAgentId === null) {
			this.gamingCheckTimer -= dt;
			if (this.gamingCheckTimer <= 0) {
				this.gamingCheckTimer = GAMING_CHECK_INTERVAL_SEC;
				this.tryStartGaming();
			}
		}

		// ── Nuzzle cat logic ───────────────────────────────────
		if (this.nuzzleAgentId !== null) {
			const nuzzleCh = this.characters.get(this.nuzzleAgentId);
			if (!nuzzleCh || nuzzleCh.isLeaving || nuzzleCh.matrixEffect) {
				// Agent was removed or is despawning — cancel nuzzle
				if (nuzzleCh) {
					nuzzleCh.isNuzzling = false;
					nuzzleCh.nuzzleTimer = 0;
				}
				this.nuzzleAgentId = null;
			} else if (nuzzleCh.isNuzzling) {
				const adjacent = this.findCatAdjacentTile();
				// Check if agent arrived at the cat-adjacent tile
				if (
					nuzzleCh.state === CharacterState.IDLE &&
					nuzzleCh.path.length === 0 &&
					adjacent &&
					nuzzleCh.tileCol === adjacent.col &&
					nuzzleCh.tileRow === adjacent.row
				) {
					// Arrived — face the cat and show hand bubble if not already showing
					if (!nuzzleCh.bubbleType) {
						nuzzleCh.dir = adjacent.facingDir;
						nuzzleCh.bubbleType = "hand";
						nuzzleCh.bubbleTimer = 0;
						nuzzleCh.nuzzleTimer = NUZZLE_HAND_DURATION_SEC + NUZZLE_HEART_DURATION_SEC;
					}
				}
				// Tick nuzzle timer while standing at cat
				if (nuzzleCh.bubbleType === "hand" || nuzzleCh.bubbleType === "heart") {
					nuzzleCh.nuzzleTimer -= dt;
					// Phase transition: hand → heart
					if (nuzzleCh.bubbleType === "hand" && nuzzleCh.nuzzleTimer <= NUZZLE_HEART_DURATION_SEC) {
						nuzzleCh.bubbleType = "heart";
					}
					// Done nuzzling
					if (nuzzleCh.nuzzleTimer <= 0) {
						this.stopNuzzle();
					}
				}
			}
		}

		// Periodically check if an idle agent should nuzzle the cat
		if (this.nuzzleAgentId === null) {
			this.nuzzleCheckTimer -= dt;
			if (this.nuzzleCheckTimer <= 0) {
				this.nuzzleCheckTimer = NUZZLE_CHECK_INTERVAL_SEC;
				this.tryStartNuzzle();
			}
		}

		// ── Drink (dispenser) logic ───────────────────────────────
		if (this.drinkAgentId !== null) {
			const drinkCh = this.characters.get(this.drinkAgentId);
			if (!drinkCh || drinkCh.isLeaving || drinkCh.matrixEffect) {
				console.log("[drink] agent %d: lost (removed/leaving/despawning)", this.drinkAgentId);
				if (drinkCh) {
					drinkCh.isDrinking = false;
					drinkCh.drinkTimer = 0;
				}
				this.drinkAgentId = null;
			} else if (drinkCh.isDrinking) {
				const adjacent = this.findAdjacentTile(FurnitureType.WATER_DISPENSER);
				if (
					drinkCh.state === CharacterState.IDLE &&
					drinkCh.path.length === 0 &&
					adjacent &&
					drinkCh.tileCol === adjacent.col &&
					drinkCh.tileRow === adjacent.row
				) {
					if (!drinkCh.bubbleType) {
						console.log(
							"[drink] agent %d: arrived at dispenser, drinking for %.0fs",
							drinkCh.id,
							drinkCh.drinkTimer,
						);
						drinkCh.dir = adjacent.facingDir;
						drinkCh.bubbleType = "drink";
						drinkCh.bubbleTimer = 0;
					}
				}
				if (drinkCh.bubbleType === "drink") {
					drinkCh.drinkTimer -= dt;
					if (drinkCh.drinkTimer <= 0) {
						this.stopDrink();
					}
				}
			}
		}

		if (this.drinkAgentId === null) {
			this.drinkCheckTimer -= dt;
			if (this.drinkCheckTimer <= 0) {
				this.drinkCheckTimer = DRINK_CHECK_INTERVAL_SEC;
				this.tryStartDrink();
			}
		}

		// ── Food (fridge) logic ───────────────────────────────────
		if (this.foodAgentId !== null) {
			const foodCh = this.characters.get(this.foodAgentId);
			if (!foodCh || foodCh.isLeaving || foodCh.matrixEffect) {
				console.log("[food] agent %d: lost (removed/leaving/despawning)", this.foodAgentId);
				if (foodCh) {
					foodCh.isEating = false;
					foodCh.eatTimer = 0;
				}
				this.foodAgentId = null;
			} else if (foodCh.isEating) {
				const adjacent = this.findAdjacentTile(FurnitureType.COOLER);
				if (
					foodCh.state === CharacterState.IDLE &&
					foodCh.path.length === 0 &&
					adjacent &&
					foodCh.tileCol === adjacent.col &&
					foodCh.tileRow === adjacent.row
				) {
					if (!foodCh.bubbleType) {
						console.log(
							"[food] agent %d: arrived at fridge, eating for %.0fs",
							foodCh.id,
							foodCh.eatTimer,
						);
						foodCh.dir = adjacent.facingDir;
						foodCh.bubbleType = "food";
						foodCh.bubbleTimer = 0;
					}
				}
				if (foodCh.bubbleType === "food") {
					foodCh.eatTimer -= dt;
					if (foodCh.eatTimer <= 0) {
						this.stopFood();
					}
				}
			}
		}

		if (this.foodAgentId === null) {
			this.foodCheckTimer -= dt;
			if (this.foodCheckTimer <= 0) {
				this.foodCheckTimer = FOOD_CHECK_INTERVAL_SEC;
				this.tryStartFood();
			}
		}

		// Remove characters that finished despawn
		if (toDelete.length > 0) {
			for (const id of toDelete) {
				this.characters.delete(id);
			}
			this.rebuildFurnitureInstances();
		}
	}

	getCharacters(): Character[] {
		return Array.from(this.characters.values());
	}

	/** Get the furniture uid at a world pixel position (tile-based hit test). Returns uid or null. */
	getFurnitureUidAt(worldX: number, worldY: number): string | null {
		const col = Math.floor(worldX / TILE_SIZE);
		const row = Math.floor(worldY / TILE_SIZE);
		for (const item of this.layout.furniture) {
			const entry = getCatalogEntry(item.type);
			if (!entry) continue;
			if (
				col >= item.col &&
				col < item.col + entry.footprintW &&
				row >= item.row &&
				row < item.row + entry.footprintH
			) {
				return item.uid;
			}
		}
		return null;
	}

	/** Hit-test the walking cat (approximate bounding box, anchored bottom-center). */
	isCatAt(worldX: number, worldY: number): boolean {
		const cat = this.walkingCat;
		const halfW = CAT_RENDER_WIDTH / 2;
		const catH = CAT_RENDER_WIDTH * 0.8;
		return (
			worldX >= cat.x - halfW &&
			worldX <= cat.x + halfW &&
			worldY >= cat.y - catH &&
			worldY <= cat.y
		);
	}

	/** Get character at pixel position (for hit testing). Returns id or null. */
	getCharacterAt(worldX: number, worldY: number): number | null {
		const chars = this.getCharacters().sort((a, b) => b.y - a.y);
		for (const ch of chars) {
			// Skip characters that are despawning
			if (ch.matrixEffect === "despawn") continue;
			// Character sprite is 16x24, anchored bottom-center
			// Apply sitting offset to match visual position
			const sittingOffset = ch.state === CharacterState.TYPE ? CHARACTER_SITTING_OFFSET_PX : 0;
			const anchorY = ch.y + sittingOffset;
			const left = ch.x - CHARACTER_HIT_HALF_WIDTH;
			const right = ch.x + CHARACTER_HIT_HALF_WIDTH;
			const top = anchorY - CHARACTER_HIT_HEIGHT;
			const bottom = anchorY;
			if (worldX >= left && worldX <= right && worldY >= top && worldY <= bottom) {
				return ch.id;
			}
		}
		return null;
	}
}
