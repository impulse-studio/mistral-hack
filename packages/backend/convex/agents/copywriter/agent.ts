import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { mistral, REASONING_MODEL } from "../models";

export const copywriterAgent = new Agent(components.agent, {
	name: "Copywriter",
	languageModel: mistral(REASONING_MODEL),
	instructions: `You are a professional copywriter agent.
You write, edit, and refine written content: blog posts, documentation, marketing copy, emails, READMEs, specs.
You read existing files for context, generate content, and save it to the shared workspace.
Be clear, concise, and adapt your tone to the task requirements.
Always save your output as a file to /home/company/outputs/.`,
	maxSteps: 10,
});
