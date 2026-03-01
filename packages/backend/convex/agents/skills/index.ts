import { roleCapabilities } from "../shared/capabilities";
import { updateTaskStatusTool, commentOnTaskTool } from "../shared/tools";
import type { RunnerCtx } from "../shared/types";
import { createShellSkills } from "./shell";
import { createFilesystemSkills } from "./filesystem";
import { createGitSkills } from "./git";
import { createGitHubSkills } from "./github";
import { createDeploySkills } from "./deploy";
import { createWebSkills } from "./web";
import { createVibeSkills } from "./vibe";

/**
 * Assemble the full skillset for an agent based on its role capabilities.
 * Each skill group is conditionally included based on `roleCapabilities[role]`.
 * All agents get task tools (updateTaskStatus, commentOnTask) for progress reporting.
 */
export function buildSkillset(ctx: RunnerCtx, agentId: string, role: string) {
	const caps = roleCapabilities[role] ?? [];
	const skills: Record<
		string,
		ReturnType<typeof createShellSkills>[keyof ReturnType<typeof createShellSkills>]
	> = {};

	// Task tools — all agents can report progress and comment on their task
	Object.assign(skills, {
		updateTaskStatus: updateTaskStatusTool,
		commentOnTask: commentOnTaskTool,
	});

	if (caps.includes("shell")) Object.assign(skills, createShellSkills(ctx, agentId));
	if (caps.includes("filesystem")) Object.assign(skills, createFilesystemSkills(ctx, agentId));
	if (caps.includes("git")) Object.assign(skills, createGitSkills(ctx, agentId));
	if (caps.includes("github")) Object.assign(skills, createGitHubSkills(ctx, agentId));
	if (caps.includes("deploy")) Object.assign(skills, createDeploySkills(ctx, agentId));
	if (caps.includes("web")) Object.assign(skills, createWebSkills(ctx, agentId));
	if (caps.includes("vibe")) Object.assign(skills, createVibeSkills(ctx, agentId));

	return skills;
}
