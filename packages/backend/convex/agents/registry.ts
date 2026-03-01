import { managerAgent } from "./manager/agent";
import { coderAgent } from "./coder/agent";
import { browserAgent } from "./browser/agent";
import { researcherAgent } from "./researcher/agent";
import { copywriterAgent } from "./copywriter/agent";
import { generalAgent } from "./general/agent";

// Agent registry — maps role names to agent configs
export const agentRegistry = {
	manager: managerAgent,
	coder: coderAgent,
	browser: browserAgent,
	designer: browserAgent,
	researcher: researcherAgent,
	copywriter: copywriterAgent,
	general: generalAgent,
} as const;
