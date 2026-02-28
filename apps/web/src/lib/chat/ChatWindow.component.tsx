import { PixelBorderBox, PixelGlow, PixelText } from "@/lib/pixel";
import { cn } from "@/lib/utils";

import { ChatInput } from "./ChatInput";
import { ChatMessageList } from "./ChatMessageList";

interface ChatWindowMessage {
	key: string;
	role: "user" | "assistant";
	text: string;
	status: "pending" | "streaming" | "complete";
}

interface ChatWindowProps {
	messages: ChatWindowMessage[];
	onSend: (text: string) => void;
	isLoading?: boolean;
	variant?: "standalone" | "panel";
	title?: string;
	className?: string;
}

function ChatWindow({
	messages,
	onSend,
	isLoading = false,
	variant = "standalone",
	title = "Manager Chat",
	className,
}: ChatWindowProps) {
	const hasStreamingMessage = messages.some((m) => m.status === "streaming");

	return (
		<PixelBorderBox
			elevation="floating"
			className={cn(
				"flex flex-col overflow-hidden",
				variant === "standalone" && "h-full",
				variant === "panel" && "h-full",
				className,
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between border-b-2 border-border bg-card px-3 py-1.5">
				<PixelText variant="label">{title}</PixelText>
				{hasStreamingMessage && <PixelGlow color="orange" pulse label="Streaming" size="sm" />}
			</div>

			{/* Messages */}
			<ChatMessageList messages={messages} isLoading={isLoading} className="flex-1" />

			{/* Input */}
			<ChatInput onSend={onSend} disabled={isLoading} />
		</PixelBorderBox>
	);
}

export { ChatWindow };
export type { ChatWindowProps, ChatWindowMessage };
