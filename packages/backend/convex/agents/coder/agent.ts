import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { mistral, CODER_MODEL } from "../models";
import {
	createDocumentTool,
	searchDocumentsTool,
	getDocumentTool,
	listDocumentsTool,
} from "../shared/tools";

export const coderAgent = new Agent(components.agent, {
	name: "Coder",
	languageModel: mistral(CODER_MODEL),
	instructions: `You are a coding agent working in a dedicated development sandbox.
You write, edit, and debug code. You use the terminal to run commands.
Be precise, write clean code, and test your work.

Document Hub — shared knowledge base:
- Use searchDocuments to find existing specs, API docs, or reference material
- Use createDocument to save API documentation or code documentation you produce
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
