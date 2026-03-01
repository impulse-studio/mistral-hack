"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { getDaytona, withRetry } from "./helpers";

// Query/mutation for snapshot config live in snapshotConfig.ts (non-node)

// ── Snapshot CRUD actions (call Daytona API) ────────────────

const snapshotReturnValidator = v.object({
	id: v.string(),
	name: v.string(),
	imageName: v.string(),
	state: v.string(),
	size: v.number(),
	cpu: v.number(),
	gpu: v.number(),
	mem: v.number(),
	disk: v.number(),
	errorReason: v.optional(v.string()),
	createdAt: v.string(),
	updatedAt: v.string(),
});

/** Subset of Daytona SnapshotDto fields we serialize for the frontend. */
interface SnapshotLike {
	id: string;
	name: string;
	imageName?: string | null;
	state: string;
	size: number | null;
	cpu: number;
	gpu: number;
	mem: number;
	disk: number;
	errorReason?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

function serializeSnapshot(s: SnapshotLike) {
	return {
		id: s.id,
		name: s.name,
		imageName: s.imageName ?? "",
		state: String(s.state),
		size: s.size ?? 0,
		cpu: s.cpu,
		gpu: s.gpu,
		mem: s.mem,
		disk: s.disk,
		errorReason: s.errorReason ?? undefined,
		createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
		updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
	};
}

export const listSnapshots = action({
	args: {},
	returns: v.array(snapshotReturnValidator),
	handler: async () => {
		const daytona = getDaytona();
		const result = await withRetry(() => daytona.snapshot.list(1, 50));
		return result.items.map(serializeSnapshot);
	},
});

export const getSnapshot = action({
	args: { name: v.string() },
	returns: snapshotReturnValidator,
	handler: async (_ctx, { name }) => {
		const daytona = getDaytona();
		const snapshot = await withRetry(() => daytona.snapshot.get(name));
		return serializeSnapshot(snapshot);
	},
});

export const createSnapshot = action({
	args: {
		name: v.string(),
		baseImage: v.optional(v.string()),
	},
	returns: snapshotReturnValidator,
	handler: async (_ctx, { name, baseImage }) => {
		const daytona = getDaytona();

		// Pass image as a plain registry string — Daytona pulls it directly
		// without a custom Dockerfile build (avoids Daytona's injected npm commands
		// failing on non-node base layers).
		// Tools (vibe CLI, gh, etc.) are installed at sandbox startup by lifecycle.ts.
		const image = baseImage || "node:20";

		console.log(`[createSnapshot] Creating snapshot "${name}" from registry image "${image}"...`);

		const snapshot = await daytona.snapshot.create(
			{ name, image },
			{
				onLogs: (chunk) => console.log(`[snapshot-build] ${chunk}`),
				timeout: 600, // 10 minutes
			},
		);

		console.log(`[createSnapshot] Snapshot "${name}" created with state: ${snapshot.state}`);
		return serializeSnapshot(snapshot);
	},
});

export const deleteSnapshot = action({
	args: { name: v.string() },
	handler: async (_ctx, { name }) => {
		const daytona = getDaytona();
		const snapshot = await withRetry(() => daytona.snapshot.get(name));
		await withRetry(() => daytona.snapshot.delete(snapshot));
		console.log(`[deleteSnapshot] Deleted snapshot "${name}"`);
	},
});
