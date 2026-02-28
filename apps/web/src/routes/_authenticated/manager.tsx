import { createFileRoute } from "@tanstack/react-router";

import { MasterAgentPanel } from "@/lib/master-agent-panel/MasterAgentPanel.component";

export const Route = createFileRoute("/_authenticated/manager")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="h-full overflow-hidden p-4">
			<MasterAgentPanel />
		</div>
	);
}
