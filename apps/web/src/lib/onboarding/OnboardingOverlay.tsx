import { api } from "@mistral-hack/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";

import { OnboardingManagerDialogue } from "./OnboardingDialog";
import { OnboardingSpotlight } from "./OnboardingSpotlight";
import { ONBOARDING_AREA_POSITIONS, ONBOARDING_STEPS } from "./constants";
import type { OnboardingState } from "./types";

/**
 * Manages onboarding step progression. Completion state is persisted
 * in the Convex `userPreferences` table so it follows the user
 * across devices.
 *
 * Returns `null` when onboarding is complete (or still loading).
 */
function useOnboarding(): OnboardingState | null {
	const [stepIndex, setStepIndex] = useState(0);
	const [dismissed, setDismissed] = useState(false);

	const onboardingCompleted = useQuery(api.userPreferences.queries.isOnboardingCompleted);
	const completeOnboarding = useMutation(api.userPreferences.mutations.completeOnboarding);

	const finish = useCallback(() => {
		setDismissed(true);
		void completeOnboarding();
	}, [completeOnboarding]);

	const onboardingNext = useCallback(() => {
		setStepIndex((prev) => {
			if (prev >= ONBOARDING_STEPS.length - 1) {
				finish();
				return prev;
			}
			return prev + 1;
		});
	}, [finish]);

	const onboardingSkip = useCallback(() => {
		finish();
	}, [finish]);

	// Still loading, already completed, or dismissed this session
	if (onboardingCompleted === undefined || onboardingCompleted || dismissed) return null;

	const step = ONBOARDING_STEPS[stepIndex]!;
	const position = ONBOARDING_AREA_POSITIONS[step.area];

	return {
		active: true,
		stepIndex,
		step,
		totalSteps: ONBOARDING_STEPS.length,
		position,
		onboardingNext,
		onboardingSkip,
	};
}

/**
 * Top-level onboarding overlay. Reads state from the hook, then
 * renders the spotlight plus the Manager NPC dialogue.
 *
 * Mount once in the office route — it self-hides when complete.
 */
export function OnboardingOverlay() {
	const state = useOnboarding();

	if (!state) return null;

	return (
		<>
			<OnboardingSpotlight position={state.position} />
			<OnboardingManagerDialogue
				step={state.step}
				stepIndex={state.stepIndex}
				totalSteps={state.totalSteps}
				onNext={state.onboardingNext}
				onSkip={state.onboardingSkip}
			/>
		</>
	);
}
