import { api } from "@mistral-hack/backend/convex/_generated/api";
import { useAction } from "convex/react";
import { Loader, Plus, Server, SquareAlert } from "pixelarticons/react";
import { useState } from "react";

import { PixelBorderBox } from "@/lib/pixel/PixelBorderBox";
import { PixelText } from "@/lib/pixel/PixelText";

// ── Presets ────────────────────────────────────────────────

const BASE_IMAGE_PRESETS = [
	{ label: "Node 20", value: "node:20" },
	{ label: "Node 22", value: "node:22" },
	{ label: "Ubuntu 22.04", value: "ubuntu:22.04" },
	{ label: "Debian Bookworm", value: "debian:bookworm" },
	{ label: "Python 3.11", value: "python:3.11" },
] as const;

// ── Component ──────────────────────────────────────────────

interface SnapshotRecipeBuilderProps {
	onCreated: () => void;
}

export function SnapshotRecipeBuilder({ onCreated }: SnapshotRecipeBuilderProps) {
	const createSnapshot = useAction(api.sandbox.snapshots.createSnapshot);
	const createCoderSnapshot = useAction(api.sandbox.snapshots.createCoderSnapshot);

	const [name, setName] = useState("mistral-snapshot");
	const [isCreatingCoder, setIsCreatingCoder] = useState(false);
	const [baseImage, setBaseImage] = useState("node:20");
	const [customBaseImage, setCustomBaseImage] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const effectiveBaseImage = baseImage === "custom" ? customBaseImage : baseImage;

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim() || !effectiveBaseImage.trim()) return;

		setIsCreating(true);
		setError(null);

		try {
			await createSnapshot({
				name: name.trim(),
				baseImage: effectiveBaseImage.trim(),
			});
			onCreated();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<PixelBorderBox elevation="raised" className="p-0">
			<div className="border-b border-border px-4 py-3 flex items-center gap-2">
				<Plus className="h-4 w-4" />
				<PixelText variant="heading" className="text-sm">
					Create Snapshot
				</PixelText>
			</div>

			<form onSubmit={handleCreate} className="p-4 space-y-4">
				{/* Name input */}
				<div className="space-y-1">
					<label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
						Snapshot Name
					</label>
					<input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="mistral-snapshot"
						className="w-full h-8 px-3 text-xs font-mono bg-background border-2 border-border focus:border-foreground outline-none transition-colors"
						disabled={isCreating}
					/>
				</div>

				{/* Base image presets */}
				<div className="space-y-2">
					<label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
						Base Image
					</label>
					<div className="flex flex-wrap gap-2">
						{BASE_IMAGE_PRESETS.map((preset) => (
							<button
								key={preset.value}
								type="button"
								onClick={() => setBaseImage(preset.value)}
								disabled={isCreating}
								className={`h-8 px-3 text-xs font-mono border-2 transition-colors ${
									baseImage === preset.value
										? "border-foreground bg-foreground/10 text-foreground"
										: "border-border text-muted-foreground hover:border-foreground/50"
								}`}
							>
								{preset.label}
							</button>
						))}
						<button
							type="button"
							onClick={() => setBaseImage("custom")}
							disabled={isCreating}
							className={`h-8 px-3 text-xs font-mono border-2 transition-colors ${
								baseImage === "custom"
									? "border-foreground bg-foreground/10 text-foreground"
									: "border-border text-muted-foreground hover:border-foreground/50"
							}`}
						>
							Custom...
						</button>
					</div>
					{baseImage === "custom" && (
						<input
							value={customBaseImage}
							onChange={(e) => setCustomBaseImage(e.target.value)}
							placeholder="e.g. debian:bookworm-slim"
							className="w-full h-8 px-3 text-xs font-mono bg-background border-2 border-border focus:border-foreground outline-none transition-colors"
							disabled={isCreating}
						/>
					)}
				</div>

				{/* Coder snapshot (pre-built with Vibe, Node, npm) */}
				<div className="space-y-2">
					<label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
						Pre-built Coder Snapshot
					</label>
					<button
						type="button"
						onClick={async () => {
							setIsCreatingCoder(true);
							setError(null);
							try {
								await createCoderSnapshot();
								onCreated();
							} catch (err) {
								setError(err instanceof Error ? err.message : String(err));
							} finally {
								setIsCreatingCoder(false);
							}
						}}
						disabled={isCreatingCoder || isCreating}
						className="w-full h-9 text-xs font-mono uppercase tracking-widest border-2 border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
					>
						{isCreatingCoder ? (
							<>
								<Loader className="h-3 w-3 animate-spin" />
								Creating ai-office-coder (Vibe + Node + npm)...
							</>
						) : (
							<>
								<Server className="h-3 w-3" />
								Create Coder Snapshot (Vibe, Node, npm)
							</>
						)}
					</button>
					<p className="text-[10px] font-mono text-muted-foreground">
						Pre-installs Mistral Vibe CLI, git, npm. Use as default for coding agents. Takes ~5–10
						min.
					</p>
				</div>

				{/* Info */}
				<div className="text-[10px] font-mono text-muted-foreground bg-muted/30 border border-border p-2">
					The snapshot caches the base image for faster sandbox startup. The Coder snapshot includes
					Vibe CLI; otherwise tools are provisioned at boot by the sandbox lifecycle.
				</div>

				{/* Error */}
				{error && (
					<div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 p-2">
						<SquareAlert className="h-3 w-3 shrink-0 mt-0.5" />
						<span className="break-all">{error}</span>
					</div>
				)}

				{/* Submit */}
				<button
					type="submit"
					disabled={isCreating || !name.trim() || !effectiveBaseImage.trim()}
					className="w-full h-9 text-xs font-mono uppercase tracking-widest border-2 border-foreground bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{isCreating ? (
						<>
							<Loader className="h-3 w-3 animate-spin" />
							Creating snapshot...
						</>
					) : (
						<>
							<Server className="h-3 w-3" />
							Create Snapshot
						</>
					)}
				</button>
			</form>
		</PixelBorderBox>
	);
}
