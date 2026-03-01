import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { mistral, REASONING_MODEL } from "../models";

export const researcherAgent = new Agent(components.agent, {
	name: "Researcher",
	languageModel: mistral(REASONING_MODEL),
	instructions: `You are a research agent with strong reasoning and analytical capabilities.
You investigate codebases, analyze files, search for patterns, and synthesize findings.
You have access to: shell commands, git, and the full filesystem.
The shared workspace is at /home/company/ — use it for inputs and outputs.
Think step by step through research tasks. Use grep, find, cat, and other tools to gather information.
Save research findings and summaries to /home/company/outputs/.`,
	maxSteps: 15,
});
