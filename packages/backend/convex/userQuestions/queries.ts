import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { userQuestionDoc } from "../schema";

// Get the most recent pending question for a thread (UI subscribes to this)
export const getPendingForThread = query({
	args: {
		threadId: v.string(),
	},
	returns: v.union(userQuestionDoc, v.null()),
	handler: async (ctx, { threadId }) => {
		return await ctx.db
			.query("userQuestions")
			.withIndex("by_thread_status", (q) => q.eq("threadId", threadId).eq("status", "pending"))
			.order("desc")
			.first();
	},
});

// Internal fetch by ID
export const getInternal = internalQuery({
	args: {
		questionId: v.id("userQuestions"),
	},
	returns: v.union(userQuestionDoc, v.null()),
	handler: async (ctx, { questionId }) => {
		return await ctx.db.get(questionId);
	},
});
