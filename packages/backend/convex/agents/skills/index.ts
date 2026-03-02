import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { roleCapabilities } from "../shared/capabilities";
import type { RunnerCtx } from "../shared/types";
import { createShellSkills } from "./shell";
import { createFilesystemSkills } from "./filesystem";
import { createGitSkills } from "./git";
import { createGitHubSkills } from "./github";
import { createDeploySkills } from "./deploy";
import { createWebSkills } from "./web";
import { createVibeSkills } from "./vibe";

/** Shared signal: set by updateTaskStatus when the agent marks its task as terminal. */
export type DoneSignal = { value: boolean };

/**
 * Create AI SDK-compatible task tools that close over the runner context.
 * These mirror the createTool versions in shared/tools.ts but use AI SDK's
 * tool() format so they work with generateText's ReAct loop.
 *
 * When `doneSignal` is provided, setting a terminal status ("done", "review",
 * "failed", "cancelled") flips the signal so stopWhen can end the loop.
 */
function createTaskTools(ctx: RunnerCtx, doneSignal?: DoneSignal) {
	const TERMINAL_STATUSES = new Set(["done", "review", "failed", "cancelled"]);

	return {
		updateTaskStatus: tool({
			description:
				"Update the status of your current task. Use this to report progress or mark completion/failure. IMPORTANT: After setting status to 'done' or 'review', the agent loop will stop — make sure all work is finished before calling this.",
			inputSchema: z.object({
				taskId: z.string().describe("The task ID. Must be a task ID, NOT an agent ID."),
				status: z
					.enum([
						"backlog",
						"todo",
						"waiting",
						"in_progress",
						"review",
						"done",
						"failed",
						"cancelled",
					])
					.describe(
						"New status. Use 'waiting' when the task needs user input. Use 'cancelled' to cancel.",
					),
			}),
			execute: async ({ taskId, status }) => {
				try {
					await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
						taskId: taskId as Id<"tasks">,
						status,
					});
					// Signal the ReAct loop to stop on terminal statuses
					if (doneSignal && TERMINAL_STATUSES.has(status)) {
						doneSignal.value = true;
					}
					return { taskId, status, message: `Task updated to "${status}".` };
				} catch (err) {
					const error = err instanceof Error ? err.message : String(err);
					return {
						taskId,
						status,
						message: `Failed to update task: ${error}. Make sure you're using a task ID, not an agent ID.`,
					};
				}
			},
		}),
		commentOnTask: tool({
			description:
				"Add a comment to a task. Use this to leave progress updates, notes, or explain blockers.",
			inputSchema: z.object({
				taskId: z.string().describe("The task ID. Must be a task ID, NOT an agent ID."),
				content: z.string().describe("Comment text"),
			}),
			execute: async ({ taskId, content }) => {
				try {
					const commentId = await ctx.runMutation(internal.tasks.comments.addInternal, {
						taskId: taskId as Id<"tasks">,
						content,
						author: "agent" as const,
					});
					return { commentId, message: "Comment added to task." };
				} catch (err) {
					const error = err instanceof Error ? err.message : String(err);
					return {
						commentId: "",
						message: `Failed to comment on task: ${error}. Make sure you're using a task ID, not an agent ID.`,
					};
				}
			},
		}),
	};
}

/**
 * Assemble the full skillset for an agent based on its role capabilities.
 * Each skill group is conditionally included based on `roleCapabilities[role]`.
 * All agents get task tools (updateTaskStatus, commentOnTask) for progress reporting.
 */
export function buildSkillset(
	ctx: RunnerCtx,
	agentId: string,
	role: string,
	doneSignal?: DoneSignal,
) {
	const caps = roleCapabilities[role] ?? [];
	const skills: Record<
		string,
		ReturnType<typeof createShellSkills>[keyof ReturnType<typeof createShellSkills>]
	> = {};

	// Task tools — AI SDK tool() format, closing over ctx + doneSignal
	Object.assign(skills, createTaskTools(ctx, doneSignal));

	if (caps.includes("shell")) Object.assign(skills, createShellSkills(ctx, agentId));
	if (caps.includes("filesystem")) Object.assign(skills, createFilesystemSkills(ctx, agentId));
	if (caps.includes("git")) Object.assign(skills, createGitSkills(ctx, agentId));
	if (caps.includes("github")) Object.assign(skills, createGitHubSkills(ctx, agentId));
	if (caps.includes("deploy")) Object.assign(skills, createDeploySkills(ctx, agentId));
	if (caps.includes("web")) Object.assign(skills, createWebSkills(ctx, agentId));
	if (caps.includes("vibe")) Object.assign(skills, createVibeSkills(ctx, agentId));

	return skills;
}
