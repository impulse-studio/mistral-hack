"use node";

import { Image } from "@daytonaio/sdk";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { getDaytona, withRetry } from "./helpers";
import { CODER_SNAPSHOT_NAME, SANDBOX_GIT_USER, SANDBOX_GIT_EMAIL } from "./constants";

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

export const createCoderSnapshot = action({
	args: {},
	returns: snapshotReturnValidator,
	handler: async (_ctx) => {
		const daytona = getDaytona();
		const image = Image.base("node:20-slim")
			.runCommands(
				"apt-get update && apt-get install -y git curl",
				"npm config set prefer-family ipv4",
				"curl -LsSf https://mistral.ai/vibe/install.sh | bash || true",
				"test -f /root/.local/bin/vibe && ln -sf /root/.local/bin/vibe /usr/local/bin/vibe || true",
				"test -f /home/daytona/.local/bin/vibe && ln -sf /home/daytona/.local/bin/vibe /usr/local/bin/vibe || true",
				`git config --global user.name "${SANDBOX_GIT_USER}"`,
				`git config --global user.email "${SANDBOX_GIT_EMAIL}"`,
				"mkdir -p /home/daytona/projects",
			)
			.workdir("/home/daytona");

		console.log(`[createCoderSnapshot] Creating snapshot "${CODER_SNAPSHOT_NAME}"...`);
		const snapshot = await daytona.snapshot.create(
			{ name: CODER_SNAPSHOT_NAME, image },
			{ onLogs: (chunk) => console.log(`[snapshot-build] ${chunk}`), timeout: 600 },
		);
		console.log(`[createCoderSnapshot] Snapshot created with state: ${snapshot.state}`);
		return serializeSnapshot(snapshot);
	},
});
