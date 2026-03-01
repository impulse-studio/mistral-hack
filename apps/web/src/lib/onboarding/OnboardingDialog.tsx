import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { PixelAvatar } from "@/lib/pixel/PixelAvatar";
import { PixelText } from "@/lib/pixel/PixelText";

import { ONBOARDING_STREAM_SPEED } from "./constants";
import type { OnboardingStep } from "./types";

interface OnboardingManagerDialogueProps {
	step: OnboardingStep;
	stepIndex: number;
	totalSteps: number;
	onNext: () => void;
	onSkip: () => void;
}

/**
 * Bottom-anchored RPG NPC dialogue box with Manager avatar.
 * Text streams in character-by-character. Click anywhere on the
 * dialogue box (or press any key) to either finish the current
 * streaming animation instantly, or advance to the next step.
 */
export function OnboardingManagerDialogue({
	step,
	stepIndex,
	totalSteps,
	onNext,
	onSkip,
}: OnboardingManagerDialogueProps) {
	const isLast = stepIndex === totalSteps - 1;
	const [charIndex, setCharIndex] = useState(0);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const isStreaming = charIndex < step.dialogue.length;
	const displayedText = step.dialogue.slice(0, charIndex);

	// Reset streaming when step changes
	useEffect(() => {
		setCharIndex(0);
	}, [step.id]);

	// Character-by-character streaming interval
	useEffect(() => {
		if (!isStreaming) return;

		intervalRef.current = setInterval(() => {
			setCharIndex((prev) => {
				if (prev >= step.dialogue.length) {
					if (intervalRef.current) clearInterval(intervalRef.current);
					return prev;
				}
				return prev + 1;
			});
		}, 1000 / ONBOARDING_STREAM_SPEED);

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [step.dialogue, isStreaming]);

	// Finish streaming instantly
	const finishStreaming = useCallback(() => {
		if (intervalRef.current) clearInterval(intervalRef.current);
		setCharIndex(step.dialogue.length);
	}, [step.dialogue.length]);

	// Keyboard: Enter finishes streaming or advances
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key !== "Enter") return;
			e.preventDefault();
			if (isStreaming) {
				finishStreaming();
			} else {
				onNext();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isStreaming, finishStreaming, onNext]);

	return (
		<div className="absolute inset-x-0 bottom-6 z-[42] flex justify-center px-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
			<div className="flex w-full max-w-[600px] items-start gap-3 border-2 border-border bg-card p-4 shadow-pixel-lg">
				{/* Manager avatar */}
				<div className="shrink-0 pt-0.5">
					<PixelAvatar initials="M" size="lg" />
				</div>

				{/* Content */}
				<div className="flex min-w-0 flex-1 flex-col ">
					<div className="flex items-center gap-2">
						<PixelText variant="heading" as="h3">
							Manager
						</PixelText>
						<PixelText variant="label" color="muted">
							{stepIndex + 1}/{totalSteps}
						</PixelText>
					</div>

					<div className="mb-2.5">
						<PixelText variant="body">
							{displayedText}
							{isStreaming && <span className="ml-px inline-block animate-pulse">|</span>}
						</PixelText>
					</div>

					{/* Actions */}
					<div className="flex items-center justify-end gap-1.5">
						<Button variant="ghost" size="xs" onClick={onSkip}>
							Skip
						</Button>
						<Button variant="accent" size="xs" onClick={isStreaming ? finishStreaming : onNext}>
							{isLast ? "Done" : "Continue"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
