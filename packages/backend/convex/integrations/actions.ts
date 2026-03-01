import { v } from "convex/values";
import { action } from "../_generated/server";

export const initiateOAuth = action({
	args: {
		toolkitSlug: v.string(),
		title: v.string(),
	},
	returns: v.object({ redirectUrl: v.string() }),
	handler: async (_ctx, { toolkitSlug, title }) => {
		// TODO: implement actual OAuth flow per toolkit
		void title;
		throw new Error(`OAuth not yet implemented for ${toolkitSlug}`);
	},
});

export const pollOAuthCompletion = action({
	args: {
		toolkitSlug: v.string(),
	},
	returns: v.object({ connected: v.boolean() }),
	handler: async (_ctx, { toolkitSlug }) => {
		// TODO: check if OAuth callback was received
		void toolkitSlug;
		return { connected: false };
	},
});

export const deleteConnection = action({
	args: {
		connectionId: v.id("integrationConnections"),
	},
	returns: v.null(),
	handler: async (ctx, { connectionId }) => {
		await ctx.runMutation(
			// biome-ignore lint/suspicious/noExplicitAny: internal API reference
			"integrations/mutations:remove" as any,
			{ connectionId },
		);
		return null;
	},
});
