import { Cancel } from "pixelarticons/react";

import { cn } from "@/lib/utils";

import { TranscriptionMicToggle } from "./PixelMicToggle";
import { TranscriptionRecordingTimer } from "./PixelRecordingTimer";
import { TranscriptionWaveform } from "./PixelWaveform";

interface TranscriptionBarProps {
	active: boolean;
	muted: boolean;
	elapsed: number;
	analyser: AnalyserNode | null;
	onMutedChange: (muted: boolean) => void;
	onStop: () => void;
	className?: string;
}

function TranscriptionBar({
	active,
	muted,
	elapsed,
	analyser,
	onMutedChange,
	onStop,
	className,
}: TranscriptionBarProps) {
	return (
		<div
			className={cn(
				"flex items-center gap-2 border-2 border-border bg-card px-2 py-1.5 shadow-pixel inset-shadow-pixel",
				className,
			)}
			data-slot="pixel-transcription-bar"
		>
			<button
				aria-label="Stop transcription"
				className={cn(
					"inline-flex size-7 items-center justify-center border-2 border-border",
					"bg-muted/50 text-muted-foreground",
					"hover:-translate-x-px hover:-translate-y-px hover:shadow-pixel-hover hover:text-foreground",
					"active:translate-x-px active:translate-y-px active:inset-shadow-pressed",
					"transition-all duration-150",
				)}
				onClick={onStop}
				type="button"
			>
				<Cancel className="size-3.5" />
			</button>

			<TranscriptionRecordingTimer active={active} elapsed={elapsed} />

			<TranscriptionWaveform analyser={analyser} className="flex-1" muted={muted} />

			<TranscriptionMicToggle muted={muted} onMutedChange={onMutedChange} />
		</div>
	);
}

export { TranscriptionBar, type TranscriptionBarProps };
