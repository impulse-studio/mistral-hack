import { query, internalQuery } from "../_generated/server";

// Get the current sandbox state
export const get = query({
	args: {},
	handler: async (ctx) => {
		const sandboxes = await ctx.db.query("sandbox").collect();
		return sandboxes[0] ?? null;
	},
});

// Internal version for use by actions
export const getInternal = internalQuery({
	args: {},
	handler: async (ctx) => {
		const sandboxes = await ctx.db.query("sandbox").collect();
		return sandboxes[0] ?? null;
	},
});

// Get sandbox status for the UI indicator
export const getStatus = query({
	args: {},
	handler: async (ctx) => {
		const sandboxes = await ctx.db.query("sandbox").collect();
		const sandbox = sandboxes[0];
		if (!sandbox) return { status: "none" as const, isActive: false };

		const isActive = sandbox.status === "running" || sandbox.status === "creating";
		const minutesSinceActivity = (Date.now() - sandbox.lastActivity) / 60_000;
		const willAutoStop = isActive && minutesSinceActivity > sandbox.autoStopInterval;

		return {
			status: sandbox.status,
			isActive,
			willAutoStop,
			minutesSinceActivity: Math.round(minutesSinceActivity),
			diskUsage: sandbox.diskUsage,
			error: sandbox.error,
		};
	},
});
