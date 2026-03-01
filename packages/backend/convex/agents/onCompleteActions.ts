"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { managerAgent } from "./manager/agent";

// Wake the manager agent by streaming a prompt message into its thread
export const notifyManagerAction = internalAction({
	args: {
		threadId: v.string(),
		promptMessageId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, { threadId, promptMessageId }) => {
		await managerAgent.streamText(
			ctx,
			{ threadId },
			{ promptMessageId },
			{ saveStreamDeltas: true },
		);
		return null;
	},
});
