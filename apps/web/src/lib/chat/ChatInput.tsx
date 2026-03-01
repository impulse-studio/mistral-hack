import { Mic, MicOff, Send } from "pixelarticons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PixelGlow } from "@/lib/pixel/PixelGlow";
import { TranscriptionWaveform } from "@/lib/transcription/PixelWaveform";
import { cn } from "@/lib/utils";

interface ChatInputProps {
	onSend: (text: string) => void;
	disabled?: boolean;
	className?: string;
	/** Voice recording state — provided by parent via useVoiceConverse. */
	voiceRecording?: boolean;
	voiceProcessing?: boolean;
	voiceAnalyser?: AnalyserNode | null;
	onVoiceStart?: () => void;
	onVoiceStop?: () => void;
	onVoiceCancel?: () => void;
}

function ChatInput({
	onSend,
	disabled = false,
	className,
	voiceRecording = false,
	voiceProcessing = false,
	voiceAnalyser = null,
	onVoiceStart,
	onVoiceStop,
	onVoiceCancel,
}: ChatInputProps) {
	const [chatInputValue, setChatInputValue] = useState("");

	function handleChatInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter" && chatInputValue.trim() !== "" && !disabled) {
			onSend(chatInputValue.trim());
			setChatInputValue("");
		}
	}

	function handleChatInputSend() {
		if (chatInputValue.trim() !== "" && !disabled) {
			onSend(chatInputValue.trim());
			setChatInputValue("");
		}
	}

	// Processing state — waiting for backend voice response
	if (voiceProcessing) {
		return (
			<div
				className={cn(
					"flex h-16 items-center justify-center gap-2 border-t-2 border-border px-3",
					className,
				)}
			>
				<PixelGlow color="orange" pulse label="Processing voice..." size="sm" />
			</div>
		);
	}

	// Recording state — show waveform + stop button
	if (voiceRecording) {
		return (
			<div className={cn("flex h-16 items-center gap-2 border-t-2 border-border px-3", className)}>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Cancel recording"
					onClick={onVoiceCancel}
					className="border-2 border-muted-foreground bg-muted/50 text-muted-foreground hover:bg-muted/75"
				>
					<MicOff className="size-4" />
				</Button>
				<TranscriptionWaveform analyser={voiceAnalyser} bars={48} className="flex-1" />
				<Button
					variant="ghost"
					size="icon"
					aria-label="Send voice message"
					onClick={onVoiceStop}
					className="border-2 border-brand-accent bg-brand-accent/15 text-brand-accent hover:bg-brand-accent/25"
				>
					<Send className="size-4" />
				</Button>
			</div>
		);
	}

	// Default state — text input + mic button
	return (
		<div className={cn("flex h-16 items-center gap-2 border-t-2 border-border px-3", className)}>
			<Button
				variant="default"
				size="icon"
				aria-label="Start voice input"
				onClick={onVoiceStart}
				disabled={disabled || !onVoiceStart}
			>
				<Mic className="size-4" />
			</Button>
			<input
				type="text"
				value={chatInputValue}
				onChange={(e) => setChatInputValue(e.target.value)}
				onKeyDown={handleChatInputKeyDown}
				placeholder="Type your message..."
				disabled={disabled}
				className="flex-1 border-2 border-border bg-transparent px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-accent focus:outline-none disabled:opacity-50"
			/>
			<Button
				variant="default"
				size="icon"
				onClick={handleChatInputSend}
				disabled={disabled || chatInputValue.trim() === ""}
			>
				<Send className="size-4" />
			</Button>
		</div>
	);
}

export { ChatInput };
export type { ChatInputProps };
