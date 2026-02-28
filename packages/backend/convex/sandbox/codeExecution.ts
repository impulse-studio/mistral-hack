"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { getRunning, recordAndLog, withRetry } from "./helpers";

// Stateless code execution via sandbox.process.codeRun()
export const runCode = internalAction({
	args: {
		code: v.string(),
		agentId: v.optional(v.id("agents")),
		timeout: v.optional(v.number()),
	},
	handler: async (ctx, { code, agentId, timeout }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx);

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"command",
			`[codeRun]\n${code.length > 500 ? code.slice(0, 500) + "..." : code}`,
		);

		const result = await withRetry(() => sandbox.process.codeRun(code, undefined, timeout));

		await recordAndLog(ctx, sandboxRecord._id, agentId, "stdout", result.result ?? "(no output)");

		return { result: result.result, exitCode: result.exitCode };
	},
});

// Write a file to the sandbox filesystem
export const writeFile = internalAction({
	args: {
		path: v.string(),
		content: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { path, content, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx);

		await withRetry(() => sandbox.fs.uploadFile(Buffer.from(content), path));

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"status",
			`Wrote file: ${path} (${content.length} bytes)`,
		);

		return { success: true as const, path };
	},
});

// Read a file from the sandbox filesystem
export const readFile = internalAction({
	args: {
		path: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { path, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx);

		const buffer = await withRetry(() => sandbox.fs.downloadFile(path));
		const content = buffer.toString("utf-8");

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"status",
			`Read file: ${path} (${content.length} bytes)`,
		);

		return { content, path };
	},
});

// List directory contents
export const listFiles = internalAction({
	args: {
		path: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { path, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx);

		const entries = await withRetry(() => sandbox.fs.listFiles(path));

		const files = entries.map((entry) => ({
			name: entry.name,
			isDir: entry.isDir,
			size: entry.size,
		}));

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"status",
			`Listed ${files.length} entries in ${path}`,
		);

		return { files };
	},
});

// Create a directory
export const createFolder = internalAction({
	args: {
		path: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { path, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx);

		await withRetry(() => sandbox.fs.createFolder(path, "755"));

		await recordAndLog(ctx, sandboxRecord._id, agentId, "status", `Created folder: ${path}`);

		return { success: true as const, path };
	},
});

// Delete a file or directory
export const deleteFile = internalAction({
	args: {
		path: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { path, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx);

		await withRetry(() => sandbox.fs.deleteFile(path));

		await recordAndLog(ctx, sandboxRecord._id, agentId, "status", `Deleted: ${path}`);

		return { success: true as const, path };
	},
});

// Search for files by name pattern
export const searchFiles = internalAction({
	args: {
		path: v.string(),
		pattern: v.string(),
		agentId: v.optional(v.id("agents")),
	},
	handler: async (ctx, { path, pattern, agentId }) => {
		const { sandbox, sandboxRecord } = await getRunning(ctx);

		const result = await withRetry(() => sandbox.fs.searchFiles(path, pattern));

		await recordAndLog(
			ctx,
			sandboxRecord._id,
			agentId,
			"status",
			`Search: ${path} pattern="${pattern}" (${result.files.length} matches)`,
		);

		return { files: result.files };
	},
});
