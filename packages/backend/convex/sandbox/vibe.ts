"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { runCommandStreaming } from "./streamLogs";
import { getDaytona, escapeShellArg, withRetry } from "./helpers";

// Run Mistral Vibe headless CLI inside the Daytona sandbox
export const runVibeHeadless = internalAction({
	args: {
		agentId: v.id("agents"),
		prompt: v.string(),
		workingDir: v.optional(v.string()),
	},
	handler: async (ctx, { agentId, prompt, workingDir }) => {
		// Update agent status to working
		await ctx.runMutation(internal.office.mutations.updateAgentStatus, {
			agentId,
			status: "working",
		});

		const sandboxRecord = await ctx.runQuery(internal.sandbox.queries.getInternal);
		if (!sandboxRecord || sandboxRecord.status !== "running") {
			throw new Error("Sandbox is not running");
		}

		const daytona = getDaytona();
		const sandbox = await withRetry(() => daytona.findOne({ idOrName: sandboxRecord.daytonaId }));

		const dir = workingDir ?? "/home/user";
		// BUG 6 FIX: Use proper POSIX single-quote shell escaping
		const escapedPrompt = escapeShellArg(prompt);
		const cmd = `cd ${dir} && mistral-vibe --headless --prompt ${escapedPrompt}`;

		// Log the command before streaming output
		await ctx.runMutation(internal.logs.mutations.append, {
			agentId,
			type: "command",
			content: `$ ${cmd}`,
		});

		// BUG 1 FIX: Don't pass sessionId — let runCommandStreaming create its own session
		const { output, exitCode } = await runCommandStreaming({
			sandbox,
			command: cmd,
			agentId,
			ctx,
		});

		// Record activity to extend auto-stop timer
		await ctx.runMutation(internal.sandbox.mutations.recordActivity, {
			sandboxId: sandboxRecord._id,
		});

		return { output, exitCode };
	},
});
