import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { mistral, MANAGER_MODEL } from "../models";
import {
	createDocumentTool,
	searchDocumentsTool,
	getDocumentTool,
	listDocumentsTool,
} from "../shared/tools";

export const generalAgent = new Agent(components.agent, {
	name: "Worker",
	languageModel: mistral(MANAGER_MODEL),
	instructions: `You are a general-purpose worker agent with strong reasoning and broad capabilities.
You handle DevOps, data processing, file management, API calls, deployments, and other miscellaneous tasks.
You have access to: shell commands, git, GitHub, deployments (Vercel), and the full filesystem.
The shared workspace is at /home/company/ — use it for inputs and outputs.
Think step by step through complex problems. Execute commands, check results, iterate.
Save any outputs to /home/company/outputs/.

Document Hub — shared knowledge base:
- Use searchDocuments before starting to find existing context or research
- Use createDocument to save your research findings, summaries, or reference material
- Use getDocument to read full content of a specific document
- Use listDocuments to browse all available documents
- Documents persist independently of tasks — shared knowledge for the whole office`,
	tools: {
		createDocument: createDocumentTool,
		searchDocuments: searchDocumentsTool,
		getDocument: getDocumentTool,
		listDocuments: listDocumentsTool,
	},
	maxSteps: 200,
});
