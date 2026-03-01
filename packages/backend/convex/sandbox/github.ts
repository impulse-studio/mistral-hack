"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { getRunning, recordAndLog } from "./helpers";
import { escapeShellArg } from "./shellUtils";

// --- GitHub CLI (gh) operations inside sandbox ---

/** Install gh CLI if not already present */
async function ensureGhCli(
	ctx: { runAction: CallableFunction },
	agentId?: string,
): Promise<void> {
	const check: { result: string; exitCode: number } = await ctx.runAction(internal.sandbox.execute.runCommand, {
		command: "which gh || true",
		agentId,
		stream: false,
	});

	if (check.result?.includes("/gh")) return;

	// Install gh CLI via tarball (works without apt/dnf)
	const install: { result: string; exitCode: number } = await ctx.runAction(internal.sandbox.execute.runCommand, {
		command: [
			"GH_VERSION=$(curl -sL https://api.github.com/repos/cli/cli/releases/latest | grep tag_name | cut -d'\"' -f4 | sed 's/v//')",
			'curl -sL "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_amd64.tar.gz" | tar xz -C /tmp',
			'cp /tmp/gh_${GH_VERSION}_linux_amd64/bin/gh /usr/local/bin/gh',
			"chmod +x /usr/local/bin/gh",
		].join(" && "),
		agentId,
	});

	if (install.exitCode !== 0) {
		throw new Error(`Failed to install gh CLI: ${install.result}`);
	}
}

export const createPR = internalAction({
	args: {
		path: v.string(),
		title: v.string(),
		body: v.string(),
		base: v.optional(v.string()),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { path, title, body, base, agentId }): Promise<{ success: boolean; output: string; prUrl: string | null }> => {
		const { sandboxRecord } = await getRunning(ctx, agentId);
		await ensureGhCli(ctx, agentId);

		let cmd = `cd ${escapeShellArg(path)} && gh pr create --title ${escapeShellArg(title)} --body ${escapeShellArg(body)}`;
		if (base) cmd += ` --base ${escapeShellArg(base)}`;

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`gh pr create --title "${title}"`,
		);

		const result: { result: string; exitCode: number } = await ctx.runAction(internal.sandbox.execute.runCommand, {
			command: cmd,
			agentId,
		});

		const output = result.result ?? "";
		// gh pr create outputs the PR URL on success
		const prUrl = output.match(/https:\/\/github\.com\/[^\s]+\/pull\/\d+/)?.[0] ?? null;

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"status",
			prUrl ? `PR created: ${prUrl}` : `gh pr create finished (exit ${result.exitCode})`,
		);

		return {
			success: result.exitCode === 0,
			output,
			prUrl,
		};
	},
});

export const createIssue = internalAction({
	args: {
		title: v.string(),
		body: v.string(),
		labels: v.optional(v.array(v.string())),
		repo: v.optional(v.string()),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { title, body, labels, repo, agentId }): Promise<{ success: boolean; output: string; issueUrl: string | null }> => {
		const { sandboxRecord } = await getRunning(ctx, agentId);
		await ensureGhCli(ctx, agentId);

		let cmd = repo
			? `gh issue create --repo ${escapeShellArg(repo)}`
			: "gh issue create";
		cmd += ` --title ${escapeShellArg(title)} --body ${escapeShellArg(body)}`;
		if (labels?.length) cmd += ` --label ${escapeShellArg(labels.join(","))}`;

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`gh issue create --title "${title}"`,
		);

		const result: { result: string; exitCode: number } = await ctx.runAction(internal.sandbox.execute.runCommand, {
			command: cmd,
			agentId,
		});

		const output = result.result ?? "";
		const issueUrl =
			output.match(/https:\/\/github\.com\/[^\s]+\/issues\/\d+/)?.[0] ?? null;

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"status",
			issueUrl
				? `Issue created: ${issueUrl}`
				: `gh issue create finished (exit ${result.exitCode})`,
		);

		return {
			success: result.exitCode === 0,
			output,
			issueUrl,
		};
	},
});

export const addComment = internalAction({
	args: {
		number: v.number(),
		body: v.string(),
		repo: v.optional(v.string()),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { number, body, repo, agentId }): Promise<{ success: boolean; output: string }> => {
		const { sandboxRecord } = await getRunning(ctx, agentId);
		await ensureGhCli(ctx, agentId);

		let cmd = repo
			? `gh issue comment ${number} --repo ${escapeShellArg(repo)}`
			: `gh issue comment ${number}`;
		cmd += ` --body ${escapeShellArg(body)}`;

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`gh issue comment #${number}`,
		);

		const result: { result: string; exitCode: number } = await ctx.runAction(internal.sandbox.execute.runCommand, {
			command: cmd,
			agentId,
		});

		return {
			success: result.exitCode === 0,
			output: result.result ?? "",
		};
	},
});
