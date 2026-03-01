"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { runCommandStreaming } from "./streamLogs";
import { getDaytona, getRunning, escapeShellArg, withRetry } from "./helpers";
import { SANDBOX_WORK_DIR } from "./constants";

const VIBE_INSTALL_CMD = [
	"which vibe > /dev/null 2>&1 || {",
	"  curl -LsSf https://mistral.ai/vibe/install.sh | bash",
	"  && VIBE_BIN=$(find $HOME/.local/bin /root/.local/bin -name vibe -type f 2>/dev/null | head -1)",
	'  && test -n "$VIBE_BIN" && ln -sf "$VIBE_BIN" /usr/local/bin/vibe 2>/dev/null || sudo ln -sf "$VIBE_BIN" /usr/local/bin/vibe',
	"}",
].join(" ");

export const installVibe = internalAction({
	args: { agentId: v.id("agents") },
	handler: async (ctx, { agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);
		const result = await sandbox.process.executeCommand(
			VIBE_INSTALL_CMD,
			undefined,
			undefined,
			120,
		);
		await ctx.runMutation(internal.sandbox.mutations.recordActivity, {
			sandboxId: sandboxRecord._id,
		});
		return { exitCode: result.exitCode, output: result.result ?? "" };
	},
});

// Run Mistral Vibe headless CLI inside the agent's Daytona sandbox
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

		// Resolve this agent's sandbox
		const sandboxRecord = await ctx.runQuery(internal.sandbox.queries.getByAgentInternal, {
			agentId,
		});
		if (!sandboxRecord || sandboxRecord.status !== "running") {
			throw new Error(`Sandbox for agent ${agentId} is not running`);
		}

		const daytona = getDaytona();
		const sandbox = await withRetry(() => daytona.findOne({ idOrName: sandboxRecord.daytonaId }));

		const dir = workingDir ?? SANDBOX_WORK_DIR;
		// BUG 6 FIX: Use proper POSIX single-quote shell escaping
		const escapedPrompt = escapeShellArg(prompt);
		const escapedDir = escapeShellArg(dir);
		const cmd = `cd ${escapedDir} && vibe --prompt ${escapedPrompt} --auto-approve`;

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
