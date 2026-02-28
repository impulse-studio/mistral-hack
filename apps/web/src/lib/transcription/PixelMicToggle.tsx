import { Mic, MicOff } from "pixelarticons/react";

import { cn } from "@/lib/utils";

interface TranscriptionMicToggleProps {
	muted: boolean;
	onMutedChange: (muted: boolean) => void;
	className?: string;
}

function TranscriptionMicToggle({ muted, onMutedChange, className }: TranscriptionMicToggleProps) {
	return (
		<div className={cn("relative w-fit shrink-0", className)} data-slot="pixel-mic-toggle">
			{!muted && (
				<span
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 border-2 border-brand-accent animate-pixel-pulse"
				/>
			)}
			<button
				aria-label={muted ? "Unmute microphone" : "Mute microphone"}
				aria-pressed={muted}
				className={cn(
					"inline-flex size-7 items-center justify-center border-2 transition-colors duration-200",
					!muted &&
						"border-brand-accent bg-brand-accent/15 text-brand-accent hover:bg-brand-accent/25",
					muted && "border-red-500 bg-red-500/15 text-red-500 hover:bg-red-500/25",
				)}
				onClick={() => onMutedChange(!muted)}
				type="button"
			>
				{muted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
			</button>
		</div>
	);
}

export { TranscriptionMicToggle, type TranscriptionMicToggleProps };
