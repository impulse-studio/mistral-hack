import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { mistral, REASONING_MODEL } from "../models";
import {
	createDocumentTool,
	searchDocumentsTool,
	getDocumentTool,
	listDocumentsTool,
} from "../shared/tools";

export const researcherAgent = new Agent(components.agent, {
	name: "Researcher",
	languageModel: mistral(REASONING_MODEL),
	instructions: `You are a research agent with strong reasoning and analytical capabilities.
You investigate codebases, analyze files, search for patterns, and synthesize findings.
You have access to: shell commands, git, and the full filesystem.
The shared workspace is at /home/company/ — use it for inputs and outputs.
Think step by step through research tasks. Use grep, find, cat, and other tools to gather information.
Save research findings and summaries to /home/company/outputs/.

Document Hub — shared knowledge base:
- Use searchDocuments to find existing research or context before starting
- Use createDocument to save your research findings and summaries
- Use getDocument to read full content of a specific document
- Use listDocuments to browse all available documents`,
	tools: {
		createDocument: createDocumentTool,
		searchDocuments: searchDocumentsTool,
		getDocument: getDocumentTool,
		listDocuments: listDocumentsTool,
	},
	maxSteps: 15,
});
