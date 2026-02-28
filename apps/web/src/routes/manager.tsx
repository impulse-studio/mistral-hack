import { createFileRoute } from "@tanstack/react-router";

import { MasterAgentPanel } from "@/lib/masterAgentPanel/MasterAgentPanel.component";

export const Route = createFileRoute("/manager")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="h-full overflow-hidden p-4">
			<MasterAgentPanel />
		</div>
	);
}
