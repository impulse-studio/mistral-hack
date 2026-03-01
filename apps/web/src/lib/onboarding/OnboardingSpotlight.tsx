import { useMemo } from "react";

import type { OnboardingAreaPosition } from "./types";

interface OnboardingSpotlightProps {
	position: OnboardingAreaPosition;
}

/**
 * Semi-transparent overlay with a radial-gradient cutout that
 * spotlights the target area of the current onboarding step.
 */
export function OnboardingSpotlight({ position }: OnboardingSpotlightProps) {
	const style = useMemo(
		() => ({
			background: `radial-gradient(circle ${position.radius} at ${position.left} ${position.top}, transparent 0%, oklch(0 0 0 / 0.6) 100%)`,
		}),
		[position.radius, position.left, position.top],
	);

	return (
		<div
			className="pointer-events-none absolute inset-0 z-[41] transition-all duration-500"
			style={style}
		/>
	);
}
