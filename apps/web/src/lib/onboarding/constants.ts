import type { OnboardingArea, OnboardingAreaPosition, OnboardingStep } from "./types";

/** Characters revealed per second during dialogue streaming. */
export const ONBOARDING_STREAM_SPEED = 70;

/** Step definitions for the Manager NPC dialogue. */
export const ONBOARDING_STEPS: OnboardingStep[] = [
	{
		id: "welcome",
		dialogue:
			"Hey there! I'm the Manager. Welcome to AI Office — your pixel-art workspace where AI agents tackle real tasks. Let me show you around!",
		area: "center",
	},
	{
		id: "navigation",
		dialogue:
			"You can scroll to zoom and middle-click to pan around. Try it — explore every corner of the office!",
		area: "center",
	},
	{
		id: "manager",
		dialogue:
			"Click on me anytime to open the chat panel. Describe what you need — I'll break it into tasks and assign agents to handle them.",
		area: "manager",
	},
	{
		id: "agents",
		dialogue:
			"When agents are working, they'll appear at their desks with active screens. Click on any agent to watch their terminal output and track progress in real time.",
		area: "desks",
	},
	{
		id: "features",
		dialogue:
			"One more thing — the bookshelf has your documents, the game table has arcade games for breaks, and there's a cat... try clicking it. That's the tour — you're all set!",
		area: "bookshelf",
	},
];

/** Viewport-relative positions for each area. */
export const ONBOARDING_AREA_POSITIONS: Record<OnboardingArea, OnboardingAreaPosition> = {
	center: { top: "50%", left: "50%", radius: "30%" },
	manager: { top: "52%", left: "32%", radius: "14%" },
	desks: { top: "55%", left: "58%", radius: "22%" },
	bookshelf: { top: "38%", left: "22%", radius: "12%" },
	"game-table": { top: "65%", left: "72%", radius: "12%" },
	cat: { top: "72%", left: "80%", radius: "10%" },
};
