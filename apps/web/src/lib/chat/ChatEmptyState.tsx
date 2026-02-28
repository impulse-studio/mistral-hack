import { PixelAvatar } from "@/lib/pixel/PixelAvatar";
import { PixelText } from "@/lib/pixel/PixelText";

function ChatEmptyState() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
			<PixelAvatar initials="M" size="lg" />
			<PixelText variant="heading">Manager</PixelText>
			<PixelText variant="body" color="muted">
				Ask me anything to get started.
			</PixelText>
		</div>
	);
}

export { ChatEmptyState };
