import { Workpool } from "@convex-dev/workpool";
import { createWorkpoolBridge } from "convex-durable-agents";
import { components } from "./_generated/api";

// Agent workpool — controls parallelism for sub-agent execution
export const agentPool = new Workpool(components.agentWorkpool, {
	maxParallelism: 5, // max 5 agents working simultaneously
	logLevel: "INFO",
	// No retries: the runner handles failures explicitly (sets task/agent status,
	// notifies manager via onSubAgentComplete). Retrying would re-run on
	// already-failed state, causing duplicate notifications and status thrashing.
	retryActionsByDefault: false,
});

// Bridge to route durable agent execution through workpool
export const { enqueueWorkpoolAction } = createWorkpoolBridge(agentPool);
