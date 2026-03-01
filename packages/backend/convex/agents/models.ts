import { createMistral } from "@ai-sdk/mistral";

// Single Mistral client instance — reused across all agent modules
export const mistral = createMistral();

// ── Model ID constants ──────────────────────────────────────
export const MANAGER_MODEL = "mistral-large-latest";
export const CODER_MODEL = "codestral-latest";
export const ROUTING_MODEL = "ministral-8b-latest";
// Magistral models have native reasoning — the AI SDK automatically
// parses reasoningText from the response. No providerOptions needed.
export const REASONING_MODEL = "magistral-medium-latest";

export const roleToModel: Record<string, string> = {
	coder: CODER_MODEL,
	browser: MANAGER_MODEL,
	designer: MANAGER_MODEL,
	researcher: REASONING_MODEL,
	copywriter: REASONING_MODEL,
	general: REASONING_MODEL,
};

// Model mapping for reference
export const modelMap = {
	manager: MANAGER_MODEL,
	coder: CODER_MODEL,
	general: REASONING_MODEL,
	routing: ROUTING_MODEL,
	reasoning: REASONING_MODEL,
} as const;
