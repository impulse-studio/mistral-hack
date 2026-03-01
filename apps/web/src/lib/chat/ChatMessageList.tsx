import type { DragEvent } from "react";

import { useCallback, useEffect, useRef, useState } from "react";

import { KANBAN_DRAG_TYPE } from "@/lib/kanban/KanbanItem.component";
import type { KanbanDragData } from "@/lib/kanban/KanbanItem.component";
import { PixelGlow } from "@/lib/pixel/PixelGlow";
import { PixelText } from "@/lib/pixel/PixelText";
import { cn } from "@/lib/utils";

import { ChatEmptyState } from "./ChatEmptyState";
import { ChatMessage } from "./ChatMessage";
import type { ChatWindowMessage } from "./ChatWindow.component";

interface ChatMessageListProps {
	messages: ChatWindowMessage[];
	isLoading: boolean;
	/** Manager processing status for contextual loading indicator. */
	managerStatus?: string;
	/** Called when a kanban task is dropped onto the chat. */
	onTaskDrop?: (data: KanbanDragData) => void;
	className?: string;
}

function ChatMessageList({
	messages,
	isLoading,
	managerStatus = "idle",
	onTaskDrop,
	className,
}: ChatMessageListProps) {
	const chatScrollContainerRef = useRef<HTMLDivElement>(null);
	const chatBottomSentinelRef = useRef<HTMLDivElement>(null);
	const [chatUserScrolledUp, setChatUserScrolledUp] = useState(false);
	const [isDragOver, setIsDragOver] = useState(false);
	const dragCounter = useRef(0);

	const hasStreamingMessage = messages.some((m) => m.status === "streaming");

	const handleChatScroll = useCallback(() => {
		const container = chatScrollContainerRef.current;
		if (!container) return;

		const { scrollTop, scrollHeight, clientHeight } = container;
		const isAtBottom = scrollHeight - scrollTop - clientHeight < 16;
		setChatUserScrolledUp(!isAtBottom);
	}, []);

	const handleDragOver = useCallback(
		(e: DragEvent<HTMLDivElement>) => {
			if (!onTaskDrop) return;
			if (!e.dataTransfer.types.includes(KANBAN_DRAG_TYPE)) return;
			e.preventDefault();
			e.dataTransfer.dropEffect = "copy";
		},
		[onTaskDrop],
	);

	const handleDragEnter = useCallback(
		(e: DragEvent<HTMLDivElement>) => {
			if (!onTaskDrop) return;
			if (!e.dataTransfer.types.includes(KANBAN_DRAG_TYPE)) return;
			e.preventDefault();
			dragCounter.current += 1;
			setIsDragOver(true);
		},
		[onTaskDrop],
	);

	const handleDragLeave = useCallback(
		(e: DragEvent<HTMLDivElement>) => {
			if (!onTaskDrop) return;
			e.preventDefault();
			dragCounter.current -= 1;
			if (dragCounter.current <= 0) {
				dragCounter.current = 0;
				setIsDragOver(false);
			}
		},
		[onTaskDrop],
	);

	const handleDrop = useCallback(
		(e: DragEvent<HTMLDivElement>) => {
			if (!onTaskDrop) return;
			e.preventDefault();
			dragCounter.current = 0;
			setIsDragOver(false);

			const raw = e.dataTransfer.getData(KANBAN_DRAG_TYPE);
			if (!raw) return;

			try {
				const data = JSON.parse(raw) as KanbanDragData;
				onTaskDrop(data);
			} catch {
				// invalid drag data — ignore
			}
		},
		[onTaskDrop],
	);

	const lastMessageText = messages[messages.length - 1]?.text;

	useEffect(() => {
		if (chatUserScrolledUp) return;

		const sentinel = chatBottomSentinelRef.current;
		if (sentinel) {
			sentinel.scrollIntoView({ block: "end" });
		}
	}, [messages.length, lastMessageText, chatUserScrolledUp]);

	if (messages.length === 0 && !isLoading) {
		return <ChatEmptyState />;
	}

	// Determine loading indicator text based on manager status
	const loadingLabel =
		managerStatus === "processing_user_request"
			? "Working on your request..."
			: managerStatus === "background_work"
				? "Working on other things..."
				: "Thinking...";

	const loadingColor =
		managerStatus === "processing_user_request"
			? "orange"
			: managerStatus === "background_work"
				? "yellow"
				: "yellow";

	return (
		<div
			ref={chatScrollContainerRef}
			onScroll={handleChatScroll}
			onDragOver={onTaskDrop ? handleDragOver : undefined}
			onDragEnter={onTaskDrop ? handleDragEnter : undefined}
			onDragLeave={onTaskDrop ? handleDragLeave : undefined}
			onDrop={onTaskDrop ? handleDrop : undefined}
			className={cn(
				"flex-1 overflow-y-auto p-3 transition-colors",
				isDragOver && "bg-brand-accent/5 ring-2 ring-inset ring-brand-accent/40",
				className,
			)}
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
						<PixelGlow color={loadingColor} pulse size="sm" />
						<PixelText variant="label" color="muted">
							{loadingLabel}
						</PixelText>
					</div>
				)}

				{isDragOver && (
					<div className="border-2 border-dashed border-brand-accent/40 bg-brand-accent/5 px-3 py-2 text-center">
						<PixelText variant="label" color="muted">
							Drop task here
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
