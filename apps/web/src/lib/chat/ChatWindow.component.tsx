import type { GenericId } from "convex/values";

import type { KanbanDragData } from "@/lib/kanban/KanbanItem.component";
import { PixelBorderBox } from "@/lib/pixel/PixelBorderBox";
import { PixelGlow } from "@/lib/pixel/PixelGlow";
import { PixelText } from "@/lib/pixel/PixelText";
import { cn } from "@/lib/utils";

import { ChatInput } from "./ChatInput";
import { ChatMessageList } from "./ChatMessageList";
import type { ChatQuestionItem } from "./ChatQuestionCard.component";
import { ChatQuestionCard } from "./ChatQuestionCard.component";

interface ChatWindowMessage {
	key: string;
	role: "user" | "assistant";
	text: string;
	status: "pending" | "streaming" | "complete";
}

interface ChatWindowPendingQuestion {
	questionId: GenericId<"userQuestions">;
	questions: ChatQuestionItem[];
}

interface ChatWindowProps {
	messages: ChatWindowMessage[];
	onSend: (text: string) => void;
	isLoading?: boolean;
	/** Manager processing status: "idle" | "processing_user_request" | "background_work" */
	managerStatus?: string;
	/** Whether the manager is actively working (processing or background). */
	isManagerWorking?: boolean;
	/** Called to hard-stop the manager and clear pending work. */
	onFullStop?: () => void;
	/** Called when a kanban task is dropped onto the chat message list. */
	onTaskDrop?: (data: KanbanDragData) => void;
	/** Pending structured question from the manager. */
	pendingQuestion?: ChatWindowPendingQuestion | null;
	variant?: "standalone" | "panel";
	title?: string;
	className?: string;
	/** Voice state — passed through to ChatInput. */
	voiceRecording?: boolean;
	voiceProcessing?: boolean;
	voiceAnalyser?: AnalyserNode | null;
	onVoiceStart?: () => void;
	onVoiceStop?: () => void;
	onVoiceCancel?: () => void;
}

function ChatWindow({
	messages,
	onSend,
	isLoading = false,
	managerStatus = "idle",
	isManagerWorking = false,
	onFullStop,
	onTaskDrop,
	pendingQuestion,
	variant = "standalone",
	title = "Manager Chat",
	className,
	voiceRecording,
	voiceProcessing,
	voiceAnalyser,
	onVoiceStart,
	onVoiceStop,
	onVoiceCancel,
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
				managerStatus={managerStatus}
				onTaskDrop={onTaskDrop}
				className="flex-1"
			/>

			{/* Pending question card */}
			{pendingQuestion && (
				<ChatQuestionCard
					questionId={pendingQuestion.questionId}
					questions={pendingQuestion.questions}
				/>
			)}

			{/* Input — disabled only while a question card is pending */}
			<ChatInput
				onSend={onSend}
				disabled={!!pendingQuestion}
				isManagerWorking={isManagerWorking}
				onFullStop={onFullStop}
				voiceRecording={voiceRecording}
				voiceProcessing={voiceProcessing}
				voiceAnalyser={voiceAnalyser}
				onVoiceStart={onVoiceStart}
				onVoiceStop={onVoiceStop}
				onVoiceCancel={onVoiceCancel}
			/>
		</PixelBorderBox>
	);
}

export { ChatWindow };
export type { ChatWindowProps, ChatWindowMessage, ChatWindowPendingQuestion };
