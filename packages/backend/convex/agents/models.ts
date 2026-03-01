import { createMistral } from "@ai-sdk/mistral";

// Single Mistral client instance — reused across all agent modules
export const mistral = createMistral();

// ── Model ID constants ──────────────────────────────────────
// Devstral 2 for code: 123B frontier; Mistral Large 3 for everything else: 675B MoE
export const MANAGER_MODEL = "mistral-large-2512";
export const CODER_MODEL = "devstral-2512";
export const ROUTING_MODEL = "mistral-large-2512";
export const REASONING_MODEL = "mistral-large-2512";

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
