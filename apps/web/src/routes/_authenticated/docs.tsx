import { createFileRoute } from "@tanstack/react-router";

import { DocumentHubSmart } from "@/lib/document-hub/DocumentHub.smart";

export const Route = createFileRoute("/_authenticated/docs")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="h-full overflow-hidden">
			<DocumentHubSmart />
		</div>
	);
}
