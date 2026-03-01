import { Check, Delete, ExternalLink, Loader } from "pixelarticons/react";

import { Button } from "@/components/ui/button";
import { PixelBadge } from "@/lib/pixel/PixelBadge";

export interface IntegrationsToolkitInfo {
	slug: string;
	name: string;
	description: string;
	icon: string;
}

export interface IntegrationsConnectionInfo {
	_id: string;
	toolkitSlug: string;
	title: string;
	status: string;
	createdAt: number;
}

export interface IntegrationsPageProps {
	toolkits: IntegrationsToolkitInfo[];
	connections: IntegrationsConnectionInfo[];
	pendingToolkit: string | null;
	onConnect: (toolkit: IntegrationsToolkitInfo) => void;
	onDisconnect: (connectionId: string) => void;
}

// ── Component ───────────────────────────────────────────

export function IntegrationsPage({
	toolkits,
	connections,
	pendingToolkit,
	onConnect,
	onDisconnect,
}: IntegrationsPageProps) {
	const connectedSlugs = new Set(connections.map((c) => c.toolkitSlug));

	return (
		<div className="max-w-4xl mx-auto p-6 space-y-8">
			{/* Available toolkits grid */}
			<div className="space-y-3">
				<h2 className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
					Available Services
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{toolkits.map((toolkit) => {
						const isConnected = connectedSlugs.has(toolkit.slug);
						const isPending = pendingToolkit === toolkit.slug;

						return (
							<div
								key={toolkit.slug}
								className="border-2 border-border bg-card p-4 space-y-3 shadow-pixel"
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="text-sm font-mono font-bold">{toolkit.name}</span>
									</div>
									{isConnected && (
										<PixelBadge color="green" variant="solid" size="sm">
											Connected
										</PixelBadge>
									)}
								</div>
								<p className="text-xs text-muted-foreground font-mono">{toolkit.description}</p>
								<div>
									{isPending ? (
										<Button
											variant="outline"
											size="sm"
											disabled
											className="w-full font-mono text-xs uppercase tracking-widest"
										>
											<Loader className="h-3 w-3 animate-spin" />
											Authorizing...
										</Button>
									) : isConnected ? (
										<Button
											variant="outline"
											size="sm"
											className="w-full font-mono text-xs uppercase tracking-widest"
											disabled
										>
											<Check className="h-3 w-3" />
											Connected
										</Button>
									) : (
										<Button
											variant="elevated"
											size="sm"
											className="w-full font-mono text-xs uppercase tracking-widest"
											onClick={() => onConnect(toolkit)}
										>
											<ExternalLink className="h-3 w-3" />
											Connect
										</Button>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Active connections */}
			{connections.length > 0 && (
				<div className="space-y-3">
					<h2 className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
						Active Connections
					</h2>
					<div className="space-y-2">
						{connections.map((conn) => (
							<div
								key={conn._id}
								className="border-2 border-border bg-card p-3 flex items-center justify-between shadow-pixel"
							>
								<div className="flex items-center gap-3">
									<div>
										<span className="text-sm font-mono font-bold">{conn.title}</span>
										<span className="text-xs text-muted-foreground font-mono ml-2">
											{conn.toolkitSlug}
										</span>
									</div>
								</div>
								<Button
									variant="destructive"
									size="xs"
									onClick={() => onDisconnect(conn._id)}
									className="font-mono text-xs uppercase tracking-widest"
								>
									<Delete className="h-3 w-3" />
									Disconnect
								</Button>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
