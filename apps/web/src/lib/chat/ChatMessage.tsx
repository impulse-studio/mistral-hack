import { useSmoothText } from "@convex-dev/agent/react";
import { Streamdown } from "streamdown";

import { PixelAvatar, PixelBadge, PixelBorderBox, PixelGlow, PixelText } from "@/lib/pixel";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
	role: "user" | "assistant";
	text: string;
	isStreaming: boolean;
	className?: string;
}

function ChatMessageContent({
	chatMessageText,
	chatMessageIsStreaming,
}: {
	chatMessageText: string;
	chatMessageIsStreaming: boolean;
}) {
	const [visibleText] = useSmoothText(chatMessageText, {
		startStreaming: chatMessageIsStreaming,
	});
	return <Streamdown>{visibleText}</Streamdown>;
}

function ChatMessage({ role, text, isStreaming, className }: ChatMessageProps) {
	const isUser = role === "user";

	return (
		<div className={cn("flex gap-2", isUser ? "ml-12 flex-row-reverse" : "mr-12", className)}>
			<PixelAvatar initials={isUser ? "U" : "M"} size="sm" className="mt-1 shrink-0" />

			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className={cn("flex items-center gap-1.5", isUser && "flex-row-reverse")}>
					<PixelBadge color={isUser ? "muted" : "orange"} size="sm">
						{isUser ? "You" : "Manager"}
					</PixelBadge>
					{isStreaming && !isUser && <PixelGlow color="orange" pulse size="sm" />}
				</div>

				<PixelBorderBox
					elevation="flat"
					variant="solid"
					className={cn(
						"px-3 py-2",
						isUser ? "border-brand-accent/30 bg-brand-accent/10" : "bg-card",
					)}
				>
					{isUser ? (
						<PixelText variant="body">{text}</PixelText>
					) : (
						<div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed">
							<ChatMessageContent chatMessageText={text} chatMessageIsStreaming={isStreaming} />
						</div>
					)}
				</PixelBorderBox>
			</div>
		</div>
	);
}

export { ChatMessage };
export type { ChatMessageProps };
