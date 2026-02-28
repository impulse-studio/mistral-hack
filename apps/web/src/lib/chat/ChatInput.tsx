import { Send } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface ChatInputProps {
	onSend: (text: string) => void;
	disabled?: boolean;
	className?: string;
}

function ChatInput({ onSend, disabled = false, className }: ChatInputProps) {
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

	return (
		<div className={cn("flex items-center gap-2 border-t-2 border-border px-3 py-2", className)}>
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
					"inline-flex items-center justify-center border-2 border-border bg-card p-2 text-foreground",
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
