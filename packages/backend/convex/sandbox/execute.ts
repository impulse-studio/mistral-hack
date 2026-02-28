"use node";

import { Daytona } from "@daytonaio/sdk";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

const getDaytona = () => new Daytona();

// Execute a command in the Daytona sandbox
export const runCommand = internalAction({
	args: {
		command: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { command, agentId }) => {
		const sandboxRecord = await ctx.runQuery(internal.sandbox.queries.getInternal);
		if (!sandboxRecord || sandboxRecord.status !== "running") {
			throw new Error("Sandbox is not running");
		}

		const daytona = getDaytona();
		const sandbox = await daytona.findOne({
			idOrName: sandboxRecord.daytonaId,
		});

		const result = await sandbox.process.executeCommand(command);

		// Record activity to extend auto-stop timer
		await ctx.runMutation(internal.sandbox.mutations.recordActivity, {
			sandboxId: sandboxRecord._id,
		});

		// Log if linked to an agent
		if (agentId) {
			await ctx.runMutation(internal.logs.mutations.append, {
				agentId,
				type: "command",
				content: `$ ${command}\n${result.result}`,
			});
		}

		return {
			result: result.result,
			exitCode: result.exitCode,
		};
	},
});
