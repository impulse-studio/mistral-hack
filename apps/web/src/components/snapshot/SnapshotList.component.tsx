import { Check, Delete, Loader, Play, Reload, Server, SquareAlert } from "pixelarticons/react";
import { useState } from "react";

import { PixelBadge } from "@/lib/pixel/PixelBadge";
import { PixelBorderBox } from "@/lib/pixel/PixelBorderBox";
import { PixelText } from "@/lib/pixel/PixelText";

// ── Types ──────────────────────────────────────────────────

export interface SnapshotInfo {
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

interface SnapshotListProps {
	snapshots: SnapshotInfo[];
	defaultSnapshot: string | null;
	loading: boolean;
	onRefresh: () => void;
	onSetDefault: (name: string) => void;
	onClearDefault: () => void;
	onDelete: (name: string) => void;
	onLaunch: (snapshotName: string) => void;
}

// ── Helpers ────────────────────────────────────────────────

const stateColor: Record<string, "green" | "yellow" | "blue" | "red" | "muted"> = {
	active: "green",
	building: "yellow",
	pending: "blue",
	error: "red",
	build_failed: "red",
};

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

// ── Snapshot Card ──────────────────────────────────────────

function SnapshotCard({
	snapshot,
	isDefault,
	onSetDefault,
	onDelete,
	onLaunch,
}: {
	snapshot: SnapshotInfo;
	isDefault: boolean;
	onSetDefault: () => void;
	onDelete: () => void;
	onLaunch: () => void;
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
		<PixelBorderBox
			elevation={isDefault ? "raised" : "flat"}
			className={`p-4 space-y-3 ${isDefault ? "border-green-500/50 bg-green-500/5" : ""}`}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="space-y-1 min-w-0">
					<div className="flex items-center gap-2">
						<PixelText variant="heading" className="text-sm truncate">
							{snapshot.name}
						</PixelText>
						<PixelBadge color={stateColor[snapshot.state.toLowerCase()] ?? "muted"}>
							{snapshot.state}
						</PixelBadge>
						{isDefault && <PixelBadge color="green">DEFAULT</PixelBadge>}
					</div>
					<PixelText variant="id" className="truncate">
						Image: {snapshot.imageName}
					</PixelText>
				</div>
				<div className="flex items-center gap-1 shrink-0">
					<button
						type="button"
						onClick={onLaunch}
						className="h-7 px-2 text-[10px] font-mono uppercase tracking-widest border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors flex items-center gap-1"
						title="Launch sandbox from this snapshot"
					>
						<Play className="h-3 w-3" />
						Launch
					</button>
					{!isDefault && (
						<button
							type="button"
							onClick={onSetDefault}
							className="h-7 px-2 text-[10px] font-mono uppercase tracking-widest border border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors flex items-center gap-1"
							title="Set as default"
						>
							<Check className="h-3 w-3" />
							Use
						</button>
					)}
					<button
						type="button"
						onClick={handleDelete}
						disabled={deleting}
						className="h-7 px-2 text-[10px] font-mono uppercase tracking-widest border border-red-500/50 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
						title="Delete snapshot"
					>
						{deleting ? (
							<Loader className="h-3 w-3 animate-spin" />
						) : (
							<Delete className="h-3 w-3" />
						)}
					</button>
				</div>
			</div>

			<div className="grid grid-cols-4 gap-3 text-xs font-mono">
				<div>
					<span className="text-muted-foreground text-[10px] uppercase tracking-widest">CPU</span>
					<p className="font-medium">{snapshot.cpu} cores</p>
				</div>
				<div>
					<span className="text-muted-foreground text-[10px] uppercase tracking-widest">
						Memory
					</span>
					<p className="font-medium">{snapshot.mem} GiB</p>
				</div>
				<div>
					<span className="text-muted-foreground text-[10px] uppercase tracking-widest">Disk</span>
					<p className="font-medium">{snapshot.disk} GiB</p>
				</div>
				<div>
					<span className="text-muted-foreground text-[10px] uppercase tracking-widest">Size</span>
					<p className="font-medium">{formatSize(snapshot.size)}</p>
				</div>
			</div>

			{snapshot.errorReason && (
				<div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 p-2">
					<SquareAlert className="h-3 w-3 shrink-0 mt-0.5" />
					<span>{snapshot.errorReason}</span>
				</div>
			)}

			<PixelText variant="id" className="text-[10px]">
				Created {formatDate(snapshot.createdAt)} — Updated {formatDate(snapshot.updatedAt)}
			</PixelText>
		</PixelBorderBox>
	);
}

// ── Snapshot List ──────────────────────────────────────────

export function SnapshotList({
	snapshots,
	defaultSnapshot,
	loading,
	onRefresh,
	onSetDefault,
	onClearDefault,
	onDelete,
	onLaunch,
}: SnapshotListProps) {
	return (
		<div className="space-y-4">
			{/* Default snapshot banner */}
			<PixelBorderBox className="p-3 flex items-center justify-between">
				<div className="text-xs font-mono">
					<span className="text-muted-foreground uppercase tracking-widest">Active snapshot: </span>
					{defaultSnapshot ? (
						<span className="font-semibold text-green-400">{defaultSnapshot}</span>
					) : (
						<span className="text-muted-foreground italic">
							None (using default TypeScript image)
						</span>
					)}
				</div>
				{defaultSnapshot && (
					<button
						type="button"
						onClick={onClearDefault}
						className="h-7 px-2 text-[10px] font-mono uppercase tracking-widest border border-border hover:bg-muted transition-colors"
					>
						Clear default
					</button>
				)}
			</PixelBorderBox>

			{/* Header + refresh */}
			<div className="flex items-center justify-between">
				<PixelText variant="heading" className="flex items-center gap-2 text-sm">
					<Server className="h-4 w-4" />
					Snapshots ({snapshots.length})
				</PixelText>
				<button
					type="button"
					onClick={onRefresh}
					disabled={loading}
					className="h-7 px-3 text-[10px] font-mono uppercase tracking-widest border border-border hover:bg-muted transition-colors flex items-center gap-1 disabled:opacity-50"
				>
					{loading ? <Loader className="h-3 w-3 animate-spin" /> : <Reload className="h-3 w-3" />}
					Refresh
				</button>
			</div>

			{/* Snapshot cards */}
			{snapshots.length === 0 ? (
				<PixelBorderBox className="p-6 text-center">
					<PixelText variant="body" color="muted">
						No snapshots found. Create one above or click Refresh.
					</PixelText>
				</PixelBorderBox>
			) : (
				<div className="space-y-3">
					{snapshots.map((snapshot) => (
						<SnapshotCard
							key={snapshot.id}
							snapshot={snapshot}
							isDefault={defaultSnapshot === snapshot.name}
							onSetDefault={() => onSetDefault(snapshot.name)}
							onDelete={() => onDelete(snapshot.name)}
							onLaunch={() => onLaunch(snapshot.name)}
						/>
					))}
				</div>
			)}
		</div>
	);
}
