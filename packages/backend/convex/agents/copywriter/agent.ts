import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { mistral, REASONING_MODEL } from "../models";
import {
	createDocumentTool,
	searchDocumentsTool,
	getDocumentTool,
	listDocumentsTool,
} from "../shared/tools";

export const copywriterAgent = new Agent(components.agent, {
	name: "Copywriter",
	languageModel: mistral(REASONING_MODEL),
	instructions: `You are a professional copywriter agent.
You write, edit, and refine written content: blog posts, documentation, marketing copy, emails, READMEs, specs.
You read existing files for context, generate content, and save it to the shared workspace.
Be clear, concise, and adapt your tone to the task requirements.
Always save your output as a file to /home/company/outputs/.

Document Hub — shared knowledge base:
- Use searchDocuments to find existing content or context before writing
- Use createDocument to save finished written content to the Doc Hub
- Use getDocument to read full content of a specific document
- Use listDocuments to browse all available documents`,
	tools: {
		createDocument: createDocumentTool,
		searchDocuments: searchDocumentsTool,
		getDocument: getDocumentTool,
		listDocuments: listDocumentsTool,
	},
	maxSteps: 10,
});
