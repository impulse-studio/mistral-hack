"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { runCoderTask } from "./coder/runner";
import { runCopywriterTask } from "./copywriter/runner";
import { runComputerUseTask } from "./browser/runner";
import { runGeneralTask } from "./general/runner";
import { roleHas } from "./shared/capabilities";

// Sub-agent runner — executed by the workpool for each sub-agent
export const runSubAgent = internalAction({
	args: {
		agentId: v.id("agents"),
		taskId: v.id("tasks"),
	},
	handler: async (
		ctx,
		{ agentId, taskId },
	): Promise<{ success: boolean; result?: string; error?: string }> => {
		// 1. Get records
		const agent = await ctx.runQuery(internal.office.queries.getAgentInternal, { agentId });
		const task = await ctx.runQuery(internal.tasks.queries.getInternal, {
			taskId,
		});
		if (!agent || !task) throw new Error("Agent or task not found");

		// 1b. Dependency guard — prevent execution if deps are unmet
		const depCheck = await ctx.runQuery(internal.tasks.dependencies.canStartInternal, {
			taskId,
		});
		if (!depCheck.canStart) {
			const names = depCheck.unmet
				.map((d: { title: string; status: string }) => `"${d.title}" (${d.status})`)
				.join(", ");
			const errorMsg = `Cannot start task "${task.title}" — unmet dependencies: ${names}`;
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
				type: "stderr" as const,
				content: errorMsg,
			});
			await ctx.runMutation(internal.agents.onComplete.onSubAgentComplete, {
				agentId,
				taskId,
				success: false,
				error: errorMsg,
			});
			return { success: false, error: errorMsg };
		}

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
			// Build env vars based on role capabilities
			const envVars: Record<string, string> = {};
			const mistralKey = process.env.MISTRAL_API_KEY;
			if (mistralKey) envVars.MISTRAL_API_KEY = mistralKey;
			if (roleHas(agent.role, "git") || roleHas(agent.role, "github")) {
				const ghToken = process.env.GITHUB_TOKEN;
				if (ghToken) envVars.GITHUB_TOKEN = ghToken;
			}
			if (roleHas(agent.role, "deploy")) {
				const vercelToken = process.env.VERCEL_TOKEN;
				if (vercelToken) envVars.VERCEL_TOKEN = vercelToken;
			}

			// Ensure per-agent sandbox is running (creates one if needed, with shared volume)
			await ctx.runAction(internal.sandbox.lifecycle.ensureRunning, {
				agentId,
				name: agent.name,
				envVars: Object.keys(envVars).length > 0 ? envVars : undefined,
			});

			// Dispatch to role-specific runner
			let result: string;
			if (agent.role === "coder") {
				result = await runCoderTask(ctx, agentId, task);
			} else if (agent.role === "browser" || agent.role === "designer") {
				result = await runComputerUseTask(ctx, agentId, task);
			} else if (agent.role === "copywriter") {
				result = await runCopywriterTask(ctx, agentId, task);
			} else {
				result = await runGeneralTask(ctx, agentId, task, agent.role);
			}

			// 3. Complete task (agent lifecycle handled by onSubAgentComplete)
			await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
				taskId,
				status: "done",
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
