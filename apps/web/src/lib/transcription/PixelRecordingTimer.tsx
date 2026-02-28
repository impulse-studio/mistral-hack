import { cn } from "@/lib/utils";

interface TranscriptionRecordingTimerProps {
	active: boolean;
	elapsed: number;
	className?: string;
}

function formatElapsed(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

function TranscriptionRecordingTimer({
	active,
	elapsed,
	className,
}: TranscriptionRecordingTimerProps) {
	return (
		<div
			className={cn("flex items-center gap-1.5 tabular-nums font-mono text-xs", className)}
			data-slot="pixel-recording-timer"
		>
			<span
				aria-hidden="true"
				className={cn(
					"size-1.5 bg-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.2)]",
					active && "animate-pixel-pulse",
				)}
			/>
			<span className="text-muted-foreground">{formatElapsed(elapsed)}</span>
		</div>
	);
}

export { TranscriptionRecordingTimer, type TranscriptionRecordingTimerProps };
