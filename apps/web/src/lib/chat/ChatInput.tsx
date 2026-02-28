import { Mic, MicOff, Send } from "pixelarticons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { TranscriptionWaveform } from "@/lib/transcription/PixelWaveform";
import { cn } from "@/lib/utils";

interface ChatInputProps {
	onSend: (text: string) => void;
	disabled?: boolean;
	className?: string;
}

function ChatInput({ onSend, disabled = false, className }: ChatInputProps) {
	const [chatInputValue, setChatInputValue] = useState("");
	const [recording, setRecording] = useState(false);
	const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const ctxRef = useRef<AudioContext | null>(null);

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

	const startRecording = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;
			const ctx = new AudioContext();
			ctxRef.current = ctx;
			const source = ctx.createMediaStreamSource(stream);
			const node = ctx.createAnalyser();
			node.fftSize = 256;
			source.connect(node);
			setAnalyser(node);
			setRecording(true);
		} catch (err) {
			console.error("Failed to access microphone:", err);
		}
	}, []);

	const stopRecording = useCallback(() => {
		streamRef.current?.getTracks().forEach((t) => t.stop());
		ctxRef.current?.close();
		streamRef.current = null;
		ctxRef.current = null;
		setAnalyser(null);
		setRecording(false);
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			streamRef.current?.getTracks().forEach((t) => t.stop());
			ctxRef.current?.close();
		};
	}, []);

	if (recording) {
		return (
			<div className={cn("flex h-16 items-center gap-2 border-t-2 border-border px-3", className)}>
				<button
					type="button"
					aria-label="Stop recording"
					onClick={stopRecording}
					className={cn(
						"inline-flex size-8 shrink-0 items-center justify-center border-2",
						"border-red-500 bg-red-500/15 text-red-500 hover:bg-red-500/25",
						"active:translate-x-px active:translate-y-px active:inset-shadow-pressed",
						"transition-all duration-150",
					)}
				>
					<MicOff className="size-4" />
				</button>
				<TranscriptionWaveform analyser={analyser} bars={48} className="flex-1" />
			</div>
		);
	}

	return (
		<div className={cn("flex h-16 items-center gap-2 border-t-2 border-border px-3", className)}>
			<button
				type="button"
				aria-label="Start voice input"
				onClick={startRecording}
				disabled={disabled}
				className={cn(
					"inline-flex shrink-0 items-center justify-center border-2 border-border bg-card p-2 text-foreground",
					"hover:-translate-x-px hover:-translate-y-px hover:shadow-pixel-hover",
					"active:translate-x-px active:translate-y-px active:inset-shadow-pressed",
					"disabled:pointer-events-none disabled:opacity-50",
				)}
			>
				<Mic className="size-4" />
			</button>
			<input
				type="text"
				value={chatInputValue}
				onChange={(e) => setChatInputValue(e.target.value)}
				onKeyDown={handleChatInputKeyDown}
				placeholder="Type your message..."
				disabled={disabled}
				className="flex-1 border-2 border-border bg-transparent px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-accent focus:outline-none disabled:opacity-50"
			/>
			<button
				type="button"
				onClick={handleChatInputSend}
				disabled={disabled || chatInputValue.trim() === ""}
				className={cn(
					"inline-flex shrink-0 items-center justify-center border-2 border-border bg-card p-2 text-foreground",
					"hover:-translate-x-px hover:-translate-y-px hover:shadow-pixel-hover",
					"active:translate-x-px active:translate-y-px active:inset-shadow-pressed",
					"disabled:pointer-events-none disabled:opacity-50",
				)}
			>
				<Send className="size-4" />
			</button>
		</div>
	);
}

export { ChatInput };
export type { ChatInputProps };
