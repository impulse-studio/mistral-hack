import type { KanbanDragData } from "@/lib/kanban/KanbanItem.component";
import { PixelBorderBox } from "@/lib/pixel/PixelBorderBox";
import { PixelGlow } from "@/lib/pixel/PixelGlow";
import { PixelText } from "@/lib/pixel/PixelText";
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
	/** Called when a kanban task is dropped onto the chat message list. */
	onTaskDrop?: (data: KanbanDragData) => void;
	variant?: "standalone" | "panel";
	title?: string;
	className?: string;
}

function ChatWindow({
	messages,
	onSend,
	isLoading = false,
	onTaskDrop,
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
			<ChatMessageList
				messages={messages}
				isLoading={isLoading}
				onTaskDrop={onTaskDrop}
				className="flex-1"
			/>

			{/* Input */}
			<ChatInput onSend={onSend} disabled={isLoading} />
		</PixelBorderBox>
	);
}

export { ChatWindow };
export type { ChatWindowProps, ChatWindowMessage };
