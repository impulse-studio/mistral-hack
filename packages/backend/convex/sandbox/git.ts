"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { getRunning, recordAndLog, withRetry } from "./helpers";

// --- Git Operations (Daytona SDK sandbox.git.*) ---

export const gitClone = internalAction({
	args: {
		url: v.string(),
		path: v.string(),
		branch: v.optional(v.string()),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { url, path, branch, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);

		const token = process.env.GITHUB_TOKEN;
		const username = token ? "x-access-token" : undefined;

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`git clone ${url} → ${path}${branch ? ` (branch: ${branch})` : ""}`,
		);

		await withRetry(() =>
			sandbox.git.clone(url, path, branch, undefined, username, token),
		);

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"status",
			`Repository cloned to ${path}`,
		);

		return { success: true, path };
	},
});

export const gitStatus = internalAction({
	args: {
		path: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { path, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);

		const status = await withRetry(() => sandbox.git.status(path));

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`git status (${path}): ${JSON.stringify(status).slice(0, 500)}`,
		);

		return status;
	},
});

export const gitAdd = internalAction({
	args: {
		path: v.string(),
		files: v.array(v.string()),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { path, files, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);

		await withRetry(() => sandbox.git.add(path, files));

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`git add ${files.join(" ")} (in ${path})`,
		);

		return { success: true };
	},
});

export const gitCommit = internalAction({
	args: {
		path: v.string(),
		message: v.string(),
		author: v.string(),
		email: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { path, message, author, email, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);

		await withRetry(() =>
			sandbox.git.commit(path, message, author, email),
		);

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`git commit -m "${message}" (by ${author} <${email}>)`,
		);

		return { success: true };
	},
});

export const gitPush = internalAction({
	args: {
		path: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { path, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);

		const token = process.env.GITHUB_TOKEN;
		const username = token ? "x-access-token" : undefined;

		await withRetry(() => sandbox.git.push(path, username, token));

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`git push (${path})`,
		);

		return { success: true };
	},
});

export const gitPull = internalAction({
	args: {
		path: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { path, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);

		const token = process.env.GITHUB_TOKEN;
		const username = token ? "x-access-token" : undefined;

		await withRetry(() => sandbox.git.pull(path, username, token));

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`git pull (${path})`,
		);

		return { success: true };
	},
});

export const gitCreateBranch = internalAction({
	args: {
		path: v.string(),
		name: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { path, name, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);

		await withRetry(() => sandbox.git.createBranch(path, name));

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`git branch ${name} (in ${path})`,
		);

		return { success: true };
	},
});

export const gitCheckoutBranch = internalAction({
	args: {
		path: v.string(),
		branch: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { path, branch, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);

		await withRetry(() => sandbox.git.checkoutBranch(path, branch));

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`git checkout ${branch} (in ${path})`,
		);

		return { success: true };
	},
});

export const gitBranches = internalAction({
	args: {
		path: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { path, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx, agentId);

		const branches = await withRetry(() => sandbox.git.branches(path));

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`git branch -a (${path}): ${JSON.stringify(branches).slice(0, 500)}`,
		);

		return branches;
	},
});
