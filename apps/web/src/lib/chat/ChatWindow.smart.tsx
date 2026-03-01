import { useUIMessages as useUIMessagesRaw, type UIMessage } from "@convex-dev/agent/react";
import { api } from "@mistral-hack/backend/convex/_generated/api";
import { useMutation, useQuery, type UsePaginatedQueryResult } from "convex/react";
import { useCallback, useMemo, useState } from "react";

import type { KanbanDragData } from "@/lib/kanban/KanbanItem.component";

import type { ChatWindowMessage } from "./ChatWindow.component";
import { ChatWindow } from "./ChatWindow.component";
import { chatUseVoiceConverse as useVoiceConverse } from "./useVoiceConverse";

// Typed wrapper — @convex-dev/agent@0.6.0-alpha generic inference is broken
const useUIMessages = useUIMessagesRaw as (
	query: typeof api.chat.listMessages,
	args: { threadId: string } | "skip",
	options: { initialNumItems: number; stream?: boolean },
) => UsePaginatedQueryResult<UIMessage>;

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
	const [chatIsLoading, setChatIsLoading] = useState(false);

	// Always use the shared thread so web + Telegram stay in sync
	const sharedThreadId = useQuery(api.chat.getSharedThreadId);
	const chatActiveThreadId = controlledThreadId ?? sharedThreadId ?? null;

	const ensureSharedThread = useMutation(api.chat.ensureSharedThread);
	const sendMessage = useMutation(api.chat.sendMessage);

	const { results: chatRawMessages } = useUIMessages(
		api.chat.listMessages,
		chatActiveThreadId ? { threadId: chatActiveThreadId } : "skip",
		{ initialNumItems: 50, stream: true },
	);

	const messages = useMemo(
		() => (chatRawMessages ?? []).map(chatWindowMapMessage),
		[chatRawMessages],
	);

	// ── Text send ────────────────────────────────────────
	async function handleChatSmartSend(text: string) {
		if (chatIsLoading) return;

		setChatIsLoading(true);
		try {
			let currentThreadId = chatActiveThreadId;
			if (!currentThreadId) {
				const newId = await ensureSharedThread();
				currentThreadId = newId;
				onThreadCreated?.(newId);
			}

			await sendMessage({ threadId: currentThreadId, prompt: text });
		} catch (error) {
			console.error("Failed to send message:", error);
		} finally {
			setChatIsLoading(false);
		}
	}

	// ── Voice converse ───────────────────────────────────
	const ensureThreadId = useCallback(async () => {
		if (chatActiveThreadId) return chatActiveThreadId;
		const id = await ensureSharedThread();
		onThreadCreated?.(id);
		return id;
	}, [chatActiveThreadId, ensureSharedThread, onThreadCreated]);

	const {
		voiceConverseStartRecording,
		voiceConverseStopAndSend,
		voiceConverseCancel,
		voiceConverseIsRecording,
		voiceConverseIsProcessing,
	} = useVoiceConverse({
		threadId: chatActiveThreadId,
		ensureThreadId,
	});

	const [voiceAnalyser, setVoiceAnalyser] = useState<AnalyserNode | null>(null);

	const handleVoiceStart = useCallback(async () => {
		const analyser = await voiceConverseStartRecording();
		setVoiceAnalyser(analyser);
	}, [voiceConverseStartRecording]);

	const handleVoiceStop = useCallback(() => {
		voiceConverseStopAndSend();
		setVoiceAnalyser(null);
	}, [voiceConverseStopAndSend]);

	const handleVoiceCancel = useCallback(() => {
		voiceConverseCancel();
		setVoiceAnalyser(null);
	}, [voiceConverseCancel]);

	// ── Task drop ────────────────────────────────────────
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
			voiceRecording={voiceConverseIsRecording}
			voiceProcessing={voiceConverseIsProcessing}
			voiceAnalyser={voiceAnalyser}
			onVoiceStart={handleVoiceStart}
			onVoiceStop={handleVoiceStop}
			onVoiceCancel={handleVoiceCancel}
		/>
	);
}

export { ChatWindowSmart };
export type { ChatWindowSmartProps };
