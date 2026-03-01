import { createFileRoute } from "@tanstack/react-router";

import { IntegrationsPageSmart } from "@/lib/integrations/IntegrationsPageSmart.component";

export const Route = createFileRoute("/_authenticated/integrations")({
	component: RouteComponent,
});

function RouteComponent() {
	return <IntegrationsPageSmart />;
}
