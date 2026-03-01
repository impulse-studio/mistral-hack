/** Which visual area of the office canvas a step highlights. */
export type OnboardingArea = "center" | "manager" | "desks" | "bookshelf" | "game-table" | "cat";

/** A single onboarding step. */
export interface OnboardingStep {
	id: string;
	/** Manager dialogue text (streamed character by character). */
	dialogue: string;
	/** Canvas area to spotlight. */
	area: OnboardingArea;
}

/** Viewport-relative position for a spotlight (CSS percentages). */
export interface OnboardingAreaPosition {
	top: string;
	left: string;
	/** Radial-gradient spotlight radius. */
	radius: string;
}

/** State returned by the onboarding hook. */
export interface OnboardingState {
	/** Whether onboarding is currently active. */
	active: boolean;
	/** Index of the current step (0-based). */
	stepIndex: number;
	/** Current step data. */
	step: OnboardingStep;
	/** Total number of steps. */
	totalSteps: number;
	/** Viewport position for the current step's target area. */
	position: OnboardingAreaPosition;
	/** Advance to next step (or finish if last). */
	onboardingNext: () => void;
	/** Skip all remaining steps and finish. */
	onboardingSkip: () => void;
}
