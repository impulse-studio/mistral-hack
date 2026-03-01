import { v } from "convex/values";
import { saveMessage } from "@convex-dev/agent";
import { mutation, internalMutation } from "../_generated/server";
import { components, internal } from "../_generated/api";
import { userQuestionItemValidator, userQuestionAnswerValidator } from "../schema";

// Create a pending question (called by manager tool action)
export const createInternal = internalMutation({
	args: {
		threadId: v.string(),
		taskId: v.optional(v.id("tasks")),
		questions: v.array(userQuestionItemValidator),
	},
	returns: v.id("userQuestions"),
	handler: async (ctx, { threadId, taskId, questions }) => {
		return await ctx.db.insert("userQuestions", {
			threadId,
			taskId,
			status: "pending",
			questions,
			createdAt: Date.now(),
		});
	},
});

// User submits answers from the UI
export const answer = mutation({
	args: {
		questionId: v.id("userQuestions"),
		answers: v.array(userQuestionAnswerValidator),
	},
	returns: v.null(),
	handler: async (ctx, { questionId, answers }) => {
		const question = await ctx.db.get(questionId);
		if (!question || question.status !== "pending") return;

		await ctx.db.patch(questionId, {
			answers,
			status: "answered",
			answeredAt: Date.now(),
		});

		// Summarize answers as a user message in the agent thread
		const summaryParts = question.questions.map((q, i) => {
			const ans = answers[i];
			if (!ans) return `${q.header}: (no answer)`;
			const selected = ans.selectedLabels.join(", ");
			const custom = ans.customText ? ` — "${ans.customText}"` : "";
			return `${q.header}: ${selected}${custom}`;
		});
		const prompt = `[User answered] ${summaryParts.join(" | ")}`;

		const { messageId } = await saveMessage(ctx, components.agent, {
			threadId: question.threadId,
			prompt,
		});

		// Wake the manager to process the answers
		await ctx.scheduler.runAfter(0, internal.chat.generateResponseAsync, {
			threadId: question.threadId,
			promptMessageId: messageId,
		});
	},
});

// User dismisses without answering
export const dismiss = mutation({
	args: {
		questionId: v.id("userQuestions"),
	},
	returns: v.null(),
	handler: async (ctx, { questionId }) => {
		const question = await ctx.db.get(questionId);
		if (!question || question.status !== "pending") return;

		await ctx.db.patch(questionId, {
			status: "dismissed",
		});
	},
});
