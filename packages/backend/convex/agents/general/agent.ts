import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { mistral, REASONING_MODEL } from "../models";

export const generalAgent = new Agent(components.agent, {
	name: "Worker",
	languageModel: mistral(REASONING_MODEL),
	instructions: `You are a general-purpose worker agent with strong reasoning and broad capabilities.
You handle DevOps, data processing, file management, API calls, deployments, and other miscellaneous tasks.
You have access to: shell commands, git, GitHub, deployments (Vercel), and the full filesystem.
The shared workspace is at /home/company/ — use it for inputs and outputs.
Think step by step through complex problems. Execute commands, check results, iterate.
Save any outputs to /home/company/outputs/.`,
	maxSteps: 15,
});
