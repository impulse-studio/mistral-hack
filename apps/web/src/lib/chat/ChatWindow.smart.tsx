import { api } from "@mistral-hack/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";

import type { KanbanDragData } from "@/lib/kanban/KanbanItem.component";

import type { ChatWindowMessage, ChatWindowPendingQuestion } from "./ChatWindow.component";
import { ChatWindow } from "./ChatWindow.component";
import { chatUseVoiceConverse as useVoiceConverse } from "./useVoiceConverse";

interface ChatWindowSmartProps {
	threadId?: string | null;
	onThreadCreated?: (threadId: string) => void;
	/** When true, accepts kanban task drops and auto-sends them as chat messages. */
	acceptTaskDrop?: boolean;
	variant?: "standalone" | "panel";
	title?: string;
	className?: string;
}

function ChatWindowSmart({
	threadId: controlledThreadId,
	onThreadCreated,
	acceptTaskDrop = false,
	variant,
	title,
	className,
}: ChatWindowSmartProps) {
	const [isSending, setIsSending] = useState(false);

	// Always use the shared thread so web + Telegram stay in sync
	const sharedThreadId = useQuery(api.chat.getSharedThreadId);
	const chatActiveThreadId = controlledThreadId ?? sharedThreadId ?? null;

	const ensureSharedThread = useMutation(api.chat.ensureSharedThread);
	const sendMessage = useMutation(api.chat.sendMessage);

	// Read user-visible messages from the messages table (replaces useUIMessages)
	const rawMessages = useQuery(api.chat.getUserVisibleMessages, { limit: 50 });

	// Manager processing status for loading indicator
	const managerStatus = useQuery(api.manager.queue.getStatus);

	const messages = useMemo((): ChatWindowMessage[] => {
		if (!rawMessages) return [];
		return rawMessages.map((m) => ({
			key: m._id,
			role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
			text: m.content,
			status: "complete" as const,
		}));
	}, [rawMessages]);

	// Loading state: sending mutation OR manager is processing a user request
	const isLoading = isSending || managerStatus === "processing_user_request";

	// ── Pending user question ────────────────────────────
	const pendingQuestionRaw = useQuery(
		api.userQuestions.queries.getPendingForThread,
		chatActiveThreadId ? { threadId: chatActiveThreadId } : "skip",
	);

	const pendingQuestion = useMemo((): ChatWindowPendingQuestion | null => {
		if (!pendingQuestionRaw) return null;
		return {
			questionId: pendingQuestionRaw._id,
			questions: pendingQuestionRaw.questions,
		};
	}, [pendingQuestionRaw]);

	// ── Text send ────────────────────────────────────────
	async function handleChatSmartSend(text: string) {
		if (isSending) return;

		setIsSending(true);
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
			setIsSending(false);
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
		[chatActiveThreadId, isSending],
	);

	return (
		<ChatWindow
			messages={messages}
			onSend={handleChatSmartSend}
			isLoading={isLoading}
			managerStatus={managerStatus ?? "idle"}
			onTaskDrop={acceptTaskDrop ? handleTaskDrop : undefined}
			pendingQuestion={pendingQuestion}
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
