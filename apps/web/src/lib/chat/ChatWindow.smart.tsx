import { useUIMessages, type UIMessage } from "@convex-dev/agent/react";
import { api } from "@mistral-hack/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useMemo, useState } from "react";

import type { ChatWindowMessage } from "./ChatWindow.component";
import { ChatWindow } from "./ChatWindow.component";

interface ChatWindowSmartProps {
	threadId?: string | null;
	onThreadCreated?: (threadId: string) => void;
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
	variant,
	title,
	className,
}: ChatWindowSmartProps) {
	const [chatInternalThreadId, setChatInternalThreadId] = useState<string | null>(null);
	const [chatIsLoading, setChatIsLoading] = useState(false);

	const chatActiveThreadId = controlledThreadId ?? chatInternalThreadId;

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
				setChatInternalThreadId(currentThreadId);
				onThreadCreated?.(currentThreadId);
			}

			await sendMessage({ threadId: currentThreadId, prompt: text });
		} catch (error) {
			console.error("Failed to send message:", error);
		} finally {
			setChatIsLoading(false);
		}
	}

	return (
		<ChatWindow
			messages={messages}
			onSend={handleChatSmartSend}
			isLoading={chatIsLoading}
			variant={variant}
			title={title}
			className={className}
		/>
	);
}

export { ChatWindowSmart };
export type { ChatWindowSmartProps };
