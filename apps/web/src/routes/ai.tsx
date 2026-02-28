import { createFileRoute } from "@tanstack/react-router";

import { ChatWindowSmart } from "@/lib/chat";

export const Route = createFileRoute("/ai")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="h-full w-full p-4">
			<ChatWindowSmart variant="standalone" title="Manager Chat" />
		</div>
	);
}
