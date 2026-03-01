import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { agentPool } from "../workpool";

export const save = internalMutation({
	args: {
		agentId: v.id("agents"),
		taskId: v.id("tasks"),
		messages: v.string(),
		stepsCompleted: v.number(),
		continuationCount: v.number(),
	},
	returns: v.id("continuations"),
	handler: async (ctx, { agentId, taskId, messages, stepsCompleted, continuationCount }) => {
		const existing = await ctx.db
			.query("continuations")
			.withIndex("by_task", (q) => q.eq("taskId", taskId))
			.first();

		if (existing) {
			await ctx.db.replace(existing._id, {
				agentId,
				taskId,
				messages,
				stepsCompleted,
				continuationCount,
				createdAt: Date.now(),
			});
			return existing._id;
		}

		return await ctx.db.insert("continuations", {
			agentId,
			taskId,
			messages,
			stepsCompleted,
			continuationCount,
			createdAt: Date.now(),
		});
	},
});

export const getLatest = internalQuery({
	args: { taskId: v.id("tasks") },
	returns: v.union(
		v.object({
			_id: v.id("continuations"),
			_creationTime: v.number(),
			agentId: v.id("agents"),
			taskId: v.id("tasks"),
			messages: v.string(),
			stepsCompleted: v.number(),
			continuationCount: v.number(),
			createdAt: v.number(),
		}),
		v.null(),
	),
	handler: async (ctx, { taskId }) => {
		return await ctx.db
			.query("continuations")
			.withIndex("by_task", (q) => q.eq("taskId", taskId))
			.first();
	},
});

export const cleanup = internalMutation({
	args: { taskId: v.id("tasks") },
	returns: v.null(),
	handler: async (ctx, { taskId }) => {
		const existing = await ctx.db
			.query("continuations")
			.withIndex("by_task", (q) => q.eq("taskId", taskId))
			.first();
		if (existing) {
			await ctx.db.delete(existing._id);
		}
	},
});

export const scheduleContinuation = internalMutation({
	args: {
		agentId: v.id("agents"),
		taskId: v.id("tasks"),
	},
	returns: v.null(),
	handler: async (ctx, { agentId, taskId }) => {
		await agentPool.enqueueAction(ctx, internal.agents.runner.runSubAgent, {
			agentId,
			taskId,
		});
	},
});
