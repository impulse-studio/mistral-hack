import { useUIMessages, type UIMessage } from "@convex-dev/agent/react";
import { api } from "@mistral-hack/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { KanbanDragData } from "@/lib/kanban/KanbanItem.component";

import type { ChatWindowMessage } from "./ChatWindow.component";
import { ChatWindow } from "./ChatWindow.component";

const THREAD_STORAGE_KEY = "chat-thread-id";

interface ChatWindowSmartProps {
	threadId?: string | null;
	onThreadCreated?: (threadId: string) => void;
	/** When true, accepts kanban task drops and auto-sends them as chat messages. */
	acceptTaskDrop?: boolean;
	variant?: "standalone" | "panel";
	title?: string;
	className?: string;
}

function chatWindowMapMessage(m: UIMessage): ChatWindowMessage {
	return {
		key: m.key,
		role: m.role === "user" ? "user" : "assistant",
		text: m.text ?? "",
		status:
			m.status === "streaming" ? "streaming" : m.status === "pending" ? "pending" : "complete",
	};
}

function ChatWindowSmart({
	threadId: controlledThreadId,
	onThreadCreated,
	acceptTaskDrop = false,
	variant,
	title,
	className,
}: ChatWindowSmartProps) {
	const [chatInternalThreadId, setChatInternalThreadId] = useState<string | null>(null);
	const [chatIsLoading, setChatIsLoading] = useState(false);

	useEffect(() => {
		const stored = sessionStorage.getItem(THREAD_STORAGE_KEY);
		if (stored) setChatInternalThreadId(stored);
	}, []);

	const chatActiveThreadId = controlledThreadId ?? chatInternalThreadId;

	const setAndPersistThreadId = useCallback((id: string) => {
		setChatInternalThreadId(id);
		sessionStorage.setItem(THREAD_STORAGE_KEY, id);
	}, []);

	const createThread = useMutation(api.chat.createNewThread);
	const sendMessage = useMutation(api.chat.sendMessage);

	const { results: chatRawMessages } = useUIMessages(
		api.chat.listMessages,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- useUIMessages overload doesn't narrow union correctly
		(chatActiveThreadId ? { threadId: chatActiveThreadId } : "skip") as any,
		{ initialNumItems: 50, stream: true },
	);

	const messages = useMemo(
		() => (chatRawMessages ?? []).map(chatWindowMapMessage),
		[chatRawMessages],
	);

	async function handleChatSmartSend(text: string) {
		if (chatIsLoading) return;

		setChatIsLoading(true);
		try {
			let currentThreadId = chatActiveThreadId;
			if (!currentThreadId) {
				currentThreadId = await createThread();
				setAndPersistThreadId(currentThreadId);
				onThreadCreated?.(currentThreadId);
			}

			await sendMessage({ threadId: currentThreadId, prompt: text });
		} catch (error) {
			console.error("Failed to send message:", error);
		} finally {
			setChatIsLoading(false);
		}
	}

	const handleTaskDrop = useCallback(
		(data: KanbanDragData) => {
			const prompt = `[Task: ${data.title}] (${data.id}, status: ${data.sourceStatus})`;
			handleChatSmartSend(prompt);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps -- handleChatSmartSend is stable via closure
		[chatActiveThreadId, chatIsLoading],
	);

	return (
		<ChatWindow
			messages={messages}
			onSend={handleChatSmartSend}
			isLoading={chatIsLoading}
			onTaskDrop={acceptTaskDrop ? handleTaskDrop : undefined}
			variant={variant}
			title={title}
			className={className}
		/>
	);
}

export { ChatWindowSmart };
export type { ChatWindowSmartProps };
