"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { getRunning, recordAndLog } from "./helpers";
import { SANDBOX_WORK_DIR } from "./constants";

// --- Vercel Deploy (CLI inside sandbox) ---

/** Ensure Vercel CLI is installed in the sandbox (idempotent) */
async function ensureVercelCli(
	ctx: { runAction: CallableFunction; runMutation: CallableFunction },
	sandboxRecordId: string,
	agentId?: string,
): Promise<void> {
	const check: { result: string; exitCode: number } = await ctx.runAction(
		internal.sandbox.execute.runCommand,
		{
			command: "which vercel || true",
			agentId,
			stream: false,
		},
	);

	if (check.result?.includes("/vercel")) return;

	await recordAndLog(ctx, sandboxRecordId, agentId, "status", "Installing Vercel CLI...");

	const install: { result: string; exitCode: number } = await ctx.runAction(
		internal.sandbox.execute.runCommand,
		{
			command: "npm install -g vercel@latest",
			agentId,
		},
	);

	if (install.exitCode !== 0) {
		throw new Error(`Failed to install Vercel CLI: ${install.result}`);
	}

	await recordAndLog(ctx, sandboxRecordId, agentId, "status", "Vercel CLI installed");
}

export const installVercelCli = internalAction({
	args: {
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { agentId }) => {
		const { sandboxRecord } = await getRunning(ctx, agentId);
		await ensureVercelCli(ctx, sandboxRecord._id, agentId);
		return { success: true };
	},
});

export const linkVercelProject = internalAction({
	args: {
		path: v.optional(v.string()),
		project: v.optional(v.string()),
		scope: v.optional(v.string()),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (
		ctx,
		{ path, project, scope, agentId },
	): Promise<{ success: boolean; output: string }> => {
		// Ensure sandbox is running
		if (agentId) {
			await ctx.runAction(internal.sandbox.lifecycle.ensureRunning, { agentId });
		}
		const { sandboxRecord } = await getRunning(ctx, agentId);
		await ensureVercelCli(ctx, sandboxRecord._id, agentId);

		let cmd = `cd ${path ?? SANDBOX_WORK_DIR} && CI=1 VERCEL_TELEMETRY_DISABLED=1 vercel link --yes --token=$VERCEL_TOKEN`;
		if (scope) cmd += ` --scope=${scope}`;
		if (project) cmd += ` --project=${project}`;

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`vercel link${project ? ` --project=${project}` : ""}`,
		);

		const result: { result: string; exitCode: number } = await ctx.runAction(
			internal.sandbox.execute.runCommand,
			{
				command: cmd,
				agentId,
			},
		);

		return {
			success: result.exitCode === 0,
			output: result.result ?? "",
		};
	},
});

export const deployToVercel = internalAction({
	args: {
		path: v.optional(v.string()),
		prod: v.optional(v.boolean()),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (
		ctx,
		{ path, prod, agentId },
	): Promise<{ success: boolean; output: string; deployUrl: string | null }> => {
		// Ensure sandbox is running (may have been stopped after task completion)
		if (agentId) {
			await ctx.runAction(internal.sandbox.lifecycle.ensureRunning, { agentId });
		}
		const { sandboxRecord } = await getRunning(ctx, agentId);
		await ensureVercelCli(ctx, sandboxRecord._id, agentId);

		const deployPath = path ?? SANDBOX_WORK_DIR;
		let cmd = `cd ${deployPath} && CI=1 VERCEL_TELEMETRY_DISABLED=1 vercel deploy --yes --token=$VERCEL_TOKEN`;
		if (prod) cmd += " --prod";

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`vercel deploy${prod ? " --prod" : ""}`,
		);

		const result: { result: string; exitCode: number } = await ctx.runAction(
			internal.sandbox.execute.runCommand,
			{
				command: cmd,
				agentId,
			},
		);

		// Extract deployment URL from output (Vercel prints the URL on success)
		const output = result.result ?? "";
		const urlMatch = output.match(/https:\/\/[^\s]+\.vercel\.app[^\s]*/);
		const deployUrl = urlMatch?.[0] ?? null;

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"status",
			deployUrl ? `Deployed to: ${deployUrl}` : `Deploy finished (exit ${result.exitCode})`,
		);

		return {
			success: result.exitCode === 0,
			output,
			deployUrl,
		};
	},
});
