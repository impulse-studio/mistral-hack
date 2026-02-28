import { defineAgentApi } from "convex-durable-agents";
import { components, internal } from "../_generated/api";

// Public API for the Manager agent — used by the web UI
// Must be in a non-"use node" file since it exports mutations/queries
export const {
	createThread,
	sendMessage,
	getThread,
	listMessages,
	streamUpdates,
	stopThread,
	resumeThread,
	listThreads,
} = defineAgentApi(components.durable_agents, internal.manager.handler.handler);
