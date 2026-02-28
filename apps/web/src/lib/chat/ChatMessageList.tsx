import { useCallback, useEffect, useRef, useState } from "react";

import { PixelGlow } from "@/lib/pixel/PixelGlow";
import { PixelText } from "@/lib/pixel/PixelText";
import { cn } from "@/lib/utils";

import { ChatEmptyState } from "./ChatEmptyState";
import { ChatMessage } from "./ChatMessage";
import type { ChatWindowMessage } from "./ChatWindow.component";

interface ChatMessageListProps {
	messages: ChatWindowMessage[];
	isLoading: boolean;
	className?: string;
}

function ChatMessageList({ messages, isLoading, className }: ChatMessageListProps) {
	const chatScrollContainerRef = useRef<HTMLDivElement>(null);
	const chatBottomSentinelRef = useRef<HTMLDivElement>(null);
	const [chatUserScrolledUp, setChatUserScrolledUp] = useState(false);

	const hasStreamingMessage = messages.some((m) => m.status === "streaming");

	const handleChatScroll = useCallback(() => {
		const container = chatScrollContainerRef.current;
		if (!container) return;

		const { scrollTop, scrollHeight, clientHeight } = container;
		const isAtBottom = scrollHeight - scrollTop - clientHeight < 16;
		setChatUserScrolledUp(!isAtBottom);
	}, []);

	useEffect(() => {
		if (chatUserScrolledUp) return;

		const sentinel = chatBottomSentinelRef.current;
		if (sentinel) {
			sentinel.scrollIntoView({ block: "end" });
		}
	}, [messages.length, chatUserScrolledUp]);

	if (messages.length === 0 && !isLoading) {
		return <ChatEmptyState />;
	}

	return (
		<div
			ref={chatScrollContainerRef}
			onScroll={handleChatScroll}
			className={cn("flex-1 overflow-y-auto p-3", className)}
		>
			<div className="flex flex-col gap-4">
				{messages.map((message) => (
					<ChatMessage
						key={message.key}
						role={message.role}
						text={message.text}
						isStreaming={message.status === "streaming"}
					/>
				))}

				{isLoading && !hasStreamingMessage && (
					<div className="mr-12 flex items-center gap-2 px-2 py-3">
						<PixelGlow color="yellow" pulse size="sm" />
						<PixelText variant="label" color="muted">
							Thinking...
						</PixelText>
					</div>
				)}
			</div>
			<div ref={chatBottomSentinelRef} />
		</div>
	);
}

export { ChatMessageList };
export type { ChatMessageListProps };
