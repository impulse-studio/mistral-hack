"use node";

import { Daytona } from "@daytonaio/sdk";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

const getDaytona = () => new Daytona();

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
		const sandbox = await daytona.findOne({
			idOrName: sandboxRecord.daytonaId,
		});

		const dir = workingDir ?? "/home/user";
		// Escape double quotes in prompt for shell safety
		const escapedPrompt = prompt.replace(/"/g, '\\"');
		const cmd = `cd ${dir} && mistral-vibe --headless --prompt "${escapedPrompt}"`;

		// Log the command
		await ctx.runMutation(internal.logs.mutations.append, {
			agentId,
			type: "command",
			content: `$ ${cmd}`,
		});

		// Use session-based execution for long-running commands
		const sessionId = `vibe-${agentId}-${Date.now()}`;
		await sandbox.process.createSession(sessionId);

		const commandResult = await sandbox.process.executeSessionCommand(sessionId, { command: cmd });

		// Log output (stdout and stderr separately if available)
		if (commandResult.stdout) {
			await ctx.runMutation(internal.logs.mutations.append, {
				agentId,
				type: "stdout",
				content: commandResult.stdout,
			});
		}

		if (commandResult.stderr) {
			await ctx.runMutation(internal.logs.mutations.append, {
				agentId,
				type: "stderr",
				content: commandResult.stderr,
			});
		}

		// Record activity to extend auto-stop timer
		await ctx.runMutation(internal.sandbox.mutations.recordActivity, {
			sandboxId: sandboxRecord._id,
		});

		return {
			output: commandResult.output,
			exitCode: commandResult.exitCode,
		};
	},
});
