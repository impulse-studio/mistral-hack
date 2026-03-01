import { api } from "@mistral-hack/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import {
	Loader,
	Monitor,
	Delete,
	Check,
	Plus,
	Reload,
	SquareAlert,
	Server,
} from "pixelarticons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/snapshots")({
	component: SnapshotsPage,
});

// ── Types ──────────────────────────────────────────────────────

interface SnapshotInfo {
	id: string;
	name: string;
	imageName: string;
	state: string;
	size: number;
	cpu: number;
	gpu: number;
	mem: number;
	disk: number;
	errorReason?: string;
	createdAt: string;
	updatedAt: string;
}

// ── State badge ────────────────────────────────────────────────

const stateStyles: Record<string, string> = {
	active: "bg-green-500/20 text-green-400 border-green-500/30",
	building: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
	pending: "bg-blue-500/20 text-blue-400 border-blue-500/30",
	error: "bg-red-500/20 text-red-400 border-red-500/30",
	build_failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

function StateBadge({ state }: { state: string }) {
	const style =
		stateStyles[state.toLowerCase()] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
	return (
		<span
			className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded border uppercase tracking-wider ${style}`}
		>
			{state}
		</span>
	);
}

// ── Format helpers ─────────────────────────────────────────────

function formatSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(iso: string): string {
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return iso;
	}
}

// ── Snapshot Card ──────────────────────────────────────────────

function SnapshotCard({
	snapshot,
	isDefault,
	onSetDefault,
	onDelete,
}: {
	snapshot: SnapshotInfo;
	isDefault: boolean;
	onSetDefault: () => void;
	onDelete: () => void;
}) {
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await onDelete();
		} finally {
			setDeleting(false);
		}
	};

	return (
		<div
			className={`rounded border p-4 space-y-3 ${isDefault ? "border-green-500/50 bg-green-500/5" : "border-border"}`}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="space-y-1 min-w-0">
					<div className="flex items-center gap-2">
						<h3 className="text-sm font-semibold truncate">{snapshot.name}</h3>
						<StateBadge state={snapshot.state} />
						{isDefault && (
							<span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded border bg-green-500/20 text-green-400 border-green-500/30">
								DEFAULT
							</span>
						)}
					</div>
					<p className="text-xs text-muted-foreground truncate">Image: {snapshot.imageName}</p>
				</div>
				<div className="flex items-center gap-1 shrink-0">
					{!isDefault && (
						<Button
							size="sm"
							variant="outline"
							onClick={onSetDefault}
							className="h-7 text-xs"
							title="Set as default"
						>
							<Check className="h-3 w-3 mr-1" />
							Use
						</Button>
					)}
					<Button
						size="sm"
						variant="outline"
						onClick={handleDelete}
						disabled={deleting}
						className="h-7 text-xs text-red-400 hover:text-red-300 hover:border-red-500/50"
						title="Delete snapshot"
					>
						{deleting ? (
							<Loader className="h-3 w-3 animate-spin" />
						) : (
							<Delete className="h-3 w-3" />
						)}
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-4 gap-3 text-xs">
				<div>
					<span className="text-muted-foreground">CPU</span>
					<p className="font-medium">{snapshot.cpu} cores</p>
				</div>
				<div>
					<span className="text-muted-foreground">Memory</span>
					<p className="font-medium">{snapshot.mem} GiB</p>
				</div>
				<div>
					<span className="text-muted-foreground">Disk</span>
					<p className="font-medium">{snapshot.disk} GiB</p>
				</div>
				<div>
					<span className="text-muted-foreground">Size</span>
					<p className="font-medium">{formatSize(snapshot.size)}</p>
				</div>
			</div>

			{snapshot.errorReason && (
				<div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 rounded p-2">
					<SquareAlert className="h-3 w-3 shrink-0 mt-0.5" />
					<span>{snapshot.errorReason}</span>
				</div>
			)}

			<p className="text-[10px] text-muted-foreground">
				Created {formatDate(snapshot.createdAt)} — Updated {formatDate(snapshot.updatedAt)}
			</p>
		</div>
	);
}

// ── Create Snapshot Form ───────────────────────────────────────

function CreateSnapshotForm({ onCreated }: { onCreated: () => void }) {
	const createSnapshot = useAction(api.sandbox.snapshots.createSnapshot);
	const [name, setName] = useState("mistral-snapshot");
	const [baseImage, setBaseImage] = useState("node:20");
	const [customCommands, setCustomCommands] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showCustom, setShowCustom] = useState(false);

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		setIsCreating(true);
		setError(null);

		try {
			const installCommands = customCommands.trim()
				? customCommands.trim().split("\n").filter(Boolean)
				: undefined;

			await createSnapshot({
				name: name.trim(),
				baseImage: baseImage.trim() || undefined,
				installCommands,
			});
			onCreated();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<Card>
			<CardHeader className="border-b">
				<CardTitle className="flex items-center gap-2 text-sm">
					<Plus className="h-4 w-4" />
					Create Snapshot
				</CardTitle>
			</CardHeader>
			<CardContent className="p-4">
				<form onSubmit={handleCreate} className="space-y-3">
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<label className="text-xs text-muted-foreground">Snapshot Name</label>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="mistral-snapshot"
								className="text-xs"
								disabled={isCreating}
							/>
						</div>
						<div className="space-y-1">
							<label className="text-xs text-muted-foreground">Base Image</label>
							<Input
								value={baseImage}
								onChange={(e) => setBaseImage(e.target.value)}
								placeholder="node:20"
								className="text-xs"
								disabled={isCreating}
							/>
						</div>
					</div>

					<div className="rounded border border-dashed p-3 space-y-2">
						<button
							type="button"
							onClick={() => setShowCustom(!showCustom)}
							className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
						>
							{showCustom ? "- Hide" : "+ Show"} custom install commands
							<span className="text-[10px] ml-2 opacity-60">(defaults: git, vibe CLI, gh CLI)</span>
						</button>
						{showCustom && (
							<textarea
								value={customCommands}
								onChange={(e) => setCustomCommands(e.target.value)}
								placeholder={`apt-get update && apt-get install -y git curl sudo && rm -rf /var/lib/apt/lists/*\ncurl -LsSf https://mistral.ai/vibe/install.sh | bash || true\n# One command per line...`}
								className="w-full min-h-[120px] rounded border bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring resize-y"
								disabled={isCreating}
							/>
						)}
					</div>

					{error && (
						<div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 rounded p-2">
							<SquareAlert className="h-3 w-3 shrink-0 mt-0.5" />
							<span className="break-all">{error}</span>
						</div>
					)}

					<Button
						type="submit"
						disabled={isCreating || !name.trim()}
						className="w-full h-8 text-xs"
					>
						{isCreating ? (
							<>
								<Loader className="h-3 w-3 animate-spin mr-2" />
								Building snapshot... (this may take a few minutes)
							</>
						) : (
							<>
								<Server className="h-3 w-3 mr-2" />
								Create Snapshot
							</>
						)}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

// ── Main Page ──────────────────────────────────────────────────

function SnapshotsPage() {
	const defaultSnapshot = useQuery(api.sandbox.snapshotConfig.getDefaultSnapshot);
	const setDefaultSnapshot = useMutation(api.sandbox.snapshotConfig.setDefaultSnapshot);
	const listSnapshots = useAction(api.sandbox.snapshots.listSnapshots);
	const deleteSnapshotAction = useAction(api.sandbox.snapshots.deleteSnapshot);

	const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
	const [loading, setLoading] = useState(false);
	const [loaded, setLoaded] = useState(false);

	const refresh = async () => {
		setLoading(true);
		try {
			const result = await listSnapshots();
			setSnapshots(result);
			setLoaded(true);
		} catch (err) {
			console.error("Failed to list snapshots:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleSetDefault = async (name: string) => {
		await setDefaultSnapshot({ snapshotName: name });
	};

	const handleClearDefault = async () => {
		await setDefaultSnapshot({ snapshotName: null });
	};

	const handleDelete = async (name: string) => {
		try {
			await deleteSnapshotAction({ name });
			// Clear default if we deleted the default snapshot
			if (defaultSnapshot === name) {
				await setDefaultSnapshot({ snapshotName: null });
			}
			await refresh();
		} catch (err) {
			console.error("Failed to delete snapshot:", err);
		}
	};

	return (
		<div className="max-w-4xl mx-auto p-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-lg font-bold flex items-center gap-2">
						<Monitor className="h-5 w-5" />
						Sandbox Snapshots
					</h1>
					<p className="text-xs text-muted-foreground mt-1">
						Pre-configured Daytona sandbox images with tools pre-installed. Agents will use the
						default snapshot.
					</p>
				</div>
				<Button
					size="sm"
					variant="outline"
					onClick={refresh}
					disabled={loading}
					className="h-8 text-xs"
				>
					{loading ? (
						<Loader className="h-3 w-3 animate-spin mr-1" />
					) : (
						<Reload className="h-3 w-3 mr-1" />
					)}
					{loaded ? "Refresh" : "Load Snapshots"}
				</Button>
			</div>

			{/* Current config */}
			<div className="rounded border p-3 flex items-center justify-between">
				<div className="text-xs">
					<span className="text-muted-foreground">Active snapshot: </span>
					{defaultSnapshot ? (
						<span className="font-semibold text-green-400">{defaultSnapshot}</span>
					) : (
						<span className="text-muted-foreground italic">
							None (using default TypeScript image)
						</span>
					)}
				</div>
				{defaultSnapshot && (
					<Button size="sm" variant="outline" onClick={handleClearDefault} className="h-7 text-xs">
						Clear default
					</Button>
				)}
			</div>

			{/* Create form */}
			<CreateSnapshotForm onCreated={refresh} />

			{/* Snapshot list */}
			{loaded && (
				<Card>
					<CardHeader className="border-b">
						<CardTitle className="flex items-center gap-2 text-sm">
							<Server className="h-4 w-4" />
							Existing Snapshots ({snapshots.length})
						</CardTitle>
					</CardHeader>
					<CardContent className="p-4 space-y-3">
						{snapshots.length === 0 ? (
							<p className="text-xs text-muted-foreground text-center py-4">
								No snapshots found. Create one above.
							</p>
						) : (
							snapshots.map((snapshot) => (
								<SnapshotCard
									key={snapshot.id}
									snapshot={snapshot}
									isDefault={defaultSnapshot === snapshot.name}
									onSetDefault={() => handleSetDefault(snapshot.name)}
									onDelete={() => handleDelete(snapshot.name)}
								/>
							))
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
