import { api } from "@mistral-hack/backend/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
	IntegrationsPage,
	type IntegrationsConnectionInfo,
	type IntegrationsToolkitInfo,
} from "./IntegrationsPage.component";

// ── Static toolkit list (mirrors backend) ───────────────

const AVAILABLE_TOOLKITS: IntegrationsToolkitInfo[] = [
	{
		slug: "GMAIL",
		name: "Gmail",
		description: "Send and read emails",
		icon: "mail",
	},
	{
		slug: "SLACK",
		name: "Slack",
		description: "Send messages to channels and users",
		icon: "message-square",
	},
	{
		slug: "LINEAR",
		name: "Linear",
		description: "Create and manage issues",
		icon: "layout-list",
	},
	{
		slug: "GITHUB",
		name: "GitHub",
		description: "Manage repos, PRs, and issues",
		icon: "github",
	},
	{
		slug: "NOTION",
		name: "Notion",
		description: "Read and write pages and databases",
		icon: "book-open",
	},
	{
		slug: "GOOGLE_CALENDAR",
		name: "Google Calendar",
		description: "Create and manage calendar events",
		icon: "calendar",
	},
	{
		slug: "GOOGLE_DOCS",
		name: "Google Docs",
		description: "Create and edit documents",
		icon: "file-text",
	},
	{
		slug: "GOOGLE_SHEETS",
		name: "Google Sheets",
		description: "Read and write spreadsheets",
		icon: "table",
	},
];

// ── Polling constants ───────────────────────────────────

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_TIME_MS = 2 * 60 * 1000; // 2 minutes

// ── Smart component ─────────────────────────────────────

export function IntegrationsPageSmart() {
	const connections = useQuery(api.integrations.queries.listConnections);
	const initiateOAuth = useAction(api.integrations.actions.initiateOAuth);
	const pollOAuthCompletion = useAction(api.integrations.actions.pollOAuthCompletion);
	const deleteConnectionAction = useAction(api.integrations.actions.deleteConnection);

	const [pendingToolkit, setPendingToolkit] = useState<string | null>(null);
	const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const pollStartRef = useRef<number>(0);

	// Clean up polling on unmount
	useEffect(() => {
		return () => {
			if (pollTimerRef.current) clearInterval(pollTimerRef.current);
		};
	}, []);

	const stopPolling = useCallback(() => {
		if (pollTimerRef.current) {
			clearInterval(pollTimerRef.current);
			pollTimerRef.current = null;
		}
		setPendingToolkit(null);
	}, []);

	const handleConnect = useCallback(
		async (toolkit: IntegrationsToolkitInfo) => {
			try {
				setPendingToolkit(toolkit.slug);

				const { redirectUrl } = await initiateOAuth({
					toolkitSlug: toolkit.slug,
					title: toolkit.name,
				});

				// Open OAuth popup
				const popup = window.open(redirectUrl, "_blank", "width=600,height=700");

				// Start polling for completion
				pollStartRef.current = Date.now();
				pollTimerRef.current = setInterval(async () => {
					// Timeout guard
					if (Date.now() - pollStartRef.current > MAX_POLL_TIME_MS) {
						stopPolling();
						return;
					}

					// Check if popup was closed without completing
					if (popup && popup.closed) {
						// Give a grace period — the callback might still be processing
						// Continue polling for a bit after popup closes
					}

					try {
						const { connected } = await pollOAuthCompletion({
							toolkitSlug: toolkit.slug,
						});
						if (connected) {
							stopPolling();
						}
					} catch {
						// Polling error — keep trying
					}
				}, POLL_INTERVAL_MS);
			} catch (error) {
				console.error("Failed to initiate OAuth:", error);
				stopPolling();
			}
		},
		[initiateOAuth, pollOAuthCompletion, stopPolling],
	);

	const handleDisconnect = useCallback(
		async (connectionId: string) => {
			try {
				await deleteConnectionAction({
					connectionId: connectionId as GenericId<"integrationConnections">,
				});
			} catch (error) {
				console.error("Failed to disconnect:", error);
			}
		},
		[deleteConnectionAction],
	);

	const mappedConnections: IntegrationsConnectionInfo[] = useMemo(
		() =>
			(connections ?? []).map((c) => ({
				_id: c._id,
				toolkitSlug: c.toolkitSlug,
				title: c.title,
				status: c.status,
				createdAt: c.createdAt,
			})),
		[connections],
	);

	return (
		<IntegrationsPage
			toolkits={AVAILABLE_TOOLKITS}
			connections={mappedConnections}
			pendingToolkit={pendingToolkit}
			onConnect={handleConnect}
			onDisconnect={handleDisconnect}
		/>
	);
}
