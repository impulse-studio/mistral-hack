import { api } from "@mistral-hack/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { Monitor, Server } from "pixelarticons/react";
import { useCallback, useEffect, useState } from "react";

import { SnapshotSandboxViewer } from "@/components/snapshot/SandboxViewer.component";
import { SnapshotList, type SnapshotInfo } from "@/components/snapshot/SnapshotList.component";
import { SnapshotRecipeBuilder } from "@/components/snapshot/SnapshotRecipeBuilder.component";

export const Route = createFileRoute("/_authenticated/snapshots")({
	component: SandboxManagerPage,
});

type Tab = "snapshots" | "viewer";

function SandboxManagerPage() {
	const defaultSnapshot = useQuery(api.sandbox.snapshotConfig.getDefaultSnapshot);
	const setDefaultSnapshot = useMutation(api.sandbox.snapshotConfig.setDefaultSnapshot);
	const listSnapshots = useAction(api.sandbox.snapshots.listSnapshots);
	const deleteSnapshotAction = useAction(api.sandbox.snapshots.deleteSnapshot);

	const [activeTab, setActiveTab] = useState<Tab>("snapshots");
	const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
	const [loading, setLoading] = useState(false);
	const [launchSnapshot, setLaunchSnapshot] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			const result = await listSnapshots();
			setSnapshots(result);
		} catch (err) {
			console.error("Failed to list snapshots:", err);
		} finally {
			setLoading(false);
		}
	}, [listSnapshots]);

	// Auto-load on mount
	useEffect(() => {
		refresh();
	}, [refresh]);

	const handleSetDefault = async (name: string) => {
		await setDefaultSnapshot({ snapshotName: name });
	};

	const handleClearDefault = async () => {
		await setDefaultSnapshot({ snapshotName: null });
	};

	const handleDelete = async (name: string) => {
		try {
			await deleteSnapshotAction({ name });
			if (defaultSnapshot === name) {
				await setDefaultSnapshot({ snapshotName: null });
			}
			await refresh();
		} catch (err) {
			console.error("Failed to delete snapshot:", err);
		}
	};

	const handleLaunch = (snapshotName: string) => {
		setLaunchSnapshot(snapshotName);
		setActiveTab("viewer");
	};

	return (
		<div className="max-w-5xl mx-auto p-6 space-y-4">
			{/* Page title */}
			<div>
				<h1 className="text-lg font-mono font-bold uppercase tracking-widest flex items-center gap-2">
					<Monitor className="h-5 w-5" />
					Sandbox Manager
				</h1>
				<p className="text-xs text-muted-foreground font-mono mt-1">
					Build snapshots, launch sandboxes, and take interactive control via Computer Use.
				</p>
			</div>

			{/* Tabs */}
			<div className="flex border-b-2 border-border">
				<button
					type="button"
					onClick={() => setActiveTab("snapshots")}
					className={`px-4 py-2 text-xs font-mono uppercase tracking-widest border-b-2 -mb-[2px] transition-colors flex items-center gap-2 ${
						activeTab === "snapshots"
							? "border-foreground text-foreground"
							: "border-transparent text-muted-foreground hover:text-foreground"
					}`}
				>
					<Server className="h-3 w-3" />
					Snapshots
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("viewer")}
					className={`px-4 py-2 text-xs font-mono uppercase tracking-widest border-b-2 -mb-[2px] transition-colors flex items-center gap-2 ${
						activeTab === "viewer"
							? "border-foreground text-foreground"
							: "border-transparent text-muted-foreground hover:text-foreground"
					}`}
				>
					<Monitor className="h-3 w-3" />
					Sandbox Viewer
				</button>
			</div>

			{/* Tab content */}
			{activeTab === "snapshots" && (
				<div className="space-y-6">
					<SnapshotRecipeBuilder onCreated={refresh} />
					<SnapshotList
						snapshots={snapshots}
						defaultSnapshot={defaultSnapshot ?? null}
						loading={loading}
						onRefresh={refresh}
						onSetDefault={handleSetDefault}
						onClearDefault={handleClearDefault}
						onDelete={handleDelete}
						onLaunch={handleLaunch}
					/>
				</div>
			)}

			{activeTab === "viewer" && (
				<SnapshotSandboxViewer
					initialSnapshotName={launchSnapshot}
					availableSnapshots={snapshots}
				/>
			)}
		</div>
	);
}
