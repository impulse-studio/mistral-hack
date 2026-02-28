"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

type TaskRecord = {
	title: string;
	description?: string;
};

// Run a Computer Use task: start desktop → screenshot → execute interactions → return result
async function runComputerUseTask(
	ctx: { runAction: CallableFunction; runMutation: CallableFunction },
	agentId: string,
	task: TaskRecord,
): Promise<string> {
	// 1. Ensure Computer Use environment is started (Xvfb + xfce4 + VNC)
	await ctx.runAction(internal.sandbox.lifecycle.ensureComputerUseStarted);

	await ctx.runMutation(internal.logs.mutations.append, {
		agentId,
		type: "status" as const,
		content: "Computer Use environment ready",
	});

	// 2. Take initial screenshot to see the desktop
	const screenshot = await ctx.runAction(internal.sandbox.computerUse.takeScreenshot, {
		showCursor: true,
		agentId,
	});

	// 3. Get display info for context
	const displayInfo = await ctx.runAction(internal.sandbox.computerUse.getDisplayInfo);

	// 4. Open a browser for browser-role agents
	if (task.description?.includes("http") || task.title.toLowerCase().includes("browser")) {
		await ctx.runAction(internal.sandbox.execute.runCommand, {
			command: "firefox &",
			agentId,
		});

		// Wait for browser to open, then screenshot
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 3000);
		});

		await ctx.runAction(internal.sandbox.computerUse.takeScreenshot, { showCursor: true, agentId });
	}

	const results: string[] = [
		`Computer Use task executed for: ${task.title}`,
		`Display: ${JSON.stringify(displayInfo.displays?.[0] ?? "unknown")}`,
		`Initial screenshot: ${screenshot.sizeBytes ?? 0} bytes`,
	];

	return results.join("\n");
}

// Sub-agent runner — executed by the workpool for each sub-agent
export const runSubAgent = internalAction({
	args: {
		agentId: v.id("agents"),
		taskId: v.id("tasks"),
	},
	handler: async (ctx, { agentId, taskId }) => {
		// 1. Get records
		const agent = await ctx.runQuery(internal.office.queries.getAgentInternal, { agentId });
		const task = await ctx.runQuery(internal.tasks.queries.getInternal, {
			taskId,
		});
		if (!agent || !task) throw new Error("Agent or task not found");

		// 2. Update statuses
		await ctx.runMutation(internal.office.mutations.updateAgentStatus, {
			agentId,
			status: "working",
			reasoning: `Working on: ${task.title}`,
		});
		await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
			taskId,
			status: "in_progress",
		});

		// Log start
		await ctx.runMutation(internal.logs.mutations.append, {
			agentId,
			type: "status",
			content: `Starting task: ${task.title}`,
		});

		try {
			let result: string;

			// Ensure sandbox is running before any work
			await ctx.runAction(internal.sandbox.lifecycle.ensureRunning);

			if (agent.role === "coder") {
				// Use Vibe headless in sandbox
				const vibeResult = await ctx.runAction(internal.sandbox.vibe.runVibeHeadless, {
					agentId,
					prompt: `${task.title}\n\n${task.description ?? ""}`,
				});
				result = vibeResult.output ?? "";
			} else if (agent.role === "browser" || agent.role === "designer") {
				// Use Computer Use for GUI-based tasks
				result = await runComputerUseTask(ctx, agentId, task);
			} else {
				// Shell commands for researcher/copywriter/general
				const cmdResult = await ctx.runAction(internal.sandbox.execute.runCommand, {
					command: `echo "Task: ${task.title}" && echo "Agent role: ${agent.role}"`,
					agentId,
				});
				result = cmdResult.result ?? "Non-code agent execution not yet fully implemented";
			}

			// 3. Complete task
			await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
				taskId,
				status: "done",
			});
			await ctx.runMutation(internal.office.mutations.updateAgentStatus, {
				agentId,
				status: "completed",
			});

			// Log completion
			await ctx.runMutation(internal.logs.mutations.append, {
				agentId,
				type: "status",
				content: `Task completed: ${task.title}`,
			});

			// Notify completion handler
			await ctx.runMutation(internal.agents.onComplete.onSubAgentComplete, {
				agentId,
				taskId,
				success: true,
				result,
			});

			return { success: true, result };
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);

			await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
				taskId,
				status: "failed",
			});
			await ctx.runMutation(internal.office.mutations.updateAgentStatus, {
				agentId,
				status: "failed",
			});
			await ctx.runMutation(internal.logs.mutations.append, {
				agentId,
				type: "stderr",
				content: `ERROR: ${errorMsg}`,
			});

			// Notify completion handler
			await ctx.runMutation(internal.agents.onComplete.onSubAgentComplete, {
				agentId,
				taskId,
				success: false,
				error: errorMsg,
			});

			return { success: false, error: errorMsg };
		}
	},
});
