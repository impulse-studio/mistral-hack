import { Workpool } from "@convex-dev/workpool";
import { createWorkpoolBridge } from "convex-durable-agents";
import { components } from "./_generated/api";

// Agent workpool — controls parallelism for sub-agent execution
export const agentPool = new Workpool(components.agentWorkpool, {
	maxParallelism: 5, // max 5 agents working simultaneously
	logLevel: "INFO",
	retryActionsByDefault: true,
	defaultRetryBehavior: {
		maxAttempts: 3,
		initialBackoffMs: 1000,
		base: 2,
	},
});

// Bridge to route durable agent execution through workpool
export const { enqueueWorkpoolAction } = createWorkpoolBridge(agentPool);
