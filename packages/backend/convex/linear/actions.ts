"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { getLinear } from "./LinearService";

export const getIssue = internalAction({
	args: { issueId: v.string() },
	handler: async (_ctx, { issueId }) => {
		const linear = getLinear();
		return await linear.getIssue(issueId);
	},
});

export const listIssues = internalAction({
	args: {
		teamId: v.string(),
		statusType: v.optional(v.string()),
		projectName: v.optional(v.string()),
		assigneeName: v.optional(v.string()),
		labelName: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (_ctx, args) => {
		const linear = getLinear();
		return await linear.listIssues(args);
	},
});

export const searchIssues = internalAction({
	args: {
		query: v.string(),
		teamId: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (_ctx, { query, teamId, limit }) => {
		const linear = getLinear();
		return await linear.searchIssues(query, { teamId, limit });
	},
});

export const listTeams = internalAction({
	args: {},
	handler: async () => {
		const linear = getLinear();
		return await linear.listTeams();
	},
});
