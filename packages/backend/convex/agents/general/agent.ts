import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { mistral, REASONING_MODEL } from "../models";

export const generalAgent = new Agent(components.agent, {
	name: "Worker",
	languageModel: mistral(REASONING_MODEL),
	instructions: `You are a general-purpose worker agent with strong reasoning capabilities.
You handle research, copywriting, analysis, and other non-code tasks.
Think step by step through complex problems. Be thorough but efficient.`,
	maxSteps: 10,
});
