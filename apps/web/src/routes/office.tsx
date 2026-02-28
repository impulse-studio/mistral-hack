import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { OfficeAgentPanel } from "@/components/office/OfficeAgentPanel.component";
import { OfficeCanvas } from "@/components/office/OfficeCanvas.component";
import { ManagerBar } from "@/lib/manager/ManagerBar.component";
import { initTileset } from "@/lib/pixelAgents/initTileset";
import { OfficeState } from "@/lib/pixelAgents/officeState";

const EMPTY_TASKS: never[] = [];
const EMPTY_TERMINAL: never[] = [];
const EMPTY_REASONING: never[] = [];

export const Route = createFileRoute("/office")({
	component: OfficePage,
});

function OfficePage() {
	const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
	const [isThinking, setIsThinking] = useState(false);
	const [tilesetReady, setTilesetReady] = useState(false);
	const officeRef = useRef<OfficeState | null>(null);

	// Initialize tileset (floor patterns + wall sprites) before creating OfficeState
	useEffect(() => {
		initTileset(true).then(() => setTilesetReady(true));
	}, []);

	// Create OfficeState once tileset is ready
	if (tilesetReady && !officeRef.current) {
		officeRef.current = new OfficeState();
	}
	const officeState = officeRef.current;

	// Spawn demo agents at the 4 workstations
	useEffect(() => {
		if (!officeState) return;
		const os = officeState;

		// Manager — first desk, no spawn animation
		os.addAgent(1, 0, 0, "chair-1", true);
		os.setAgentActive(1, true);
		os.setAgentTool(1, "Task");

		// Other agents spawn with staggered matrix effects
		const timers = [
			setTimeout(() => {
				os.addAgent(2, 1, 0, "chair-2");
				os.setAgentActive(2, true);
				os.setAgentTool(2, "Write");
			}, 400),
			setTimeout(() => {
				os.addAgent(3, 2, 60, "chair-3");
				os.setAgentActive(3, true);
				os.setAgentTool(3, "Read");
			}, 900),
			setTimeout(() => {
				os.addAgent(4, 3, 120, "chair-4");
				os.setAgentActive(4, true);
				os.setAgentTool(4, "Bash");
			}, 1500),
		];

		return () => {
			for (const t of timers) clearTimeout(t);
		};
	}, [officeState]);

	// Agent click handler
	const handleClickAgent = useCallback((agentId: number) => {
		setSelectedAgentId(agentId >= 0 ? agentId : null);
	}, []);

	const handleClosePanel = useCallback(() => {
		setSelectedAgentId(null);
	}, []);

	// Send task to manager (placeholder — wire Convex later)
	const handleSubmitTask = useCallback(async (prompt: string) => {
		setIsThinking(true);
		// TODO: wire to api.messages.mutations.send
		console.log("[Manager]", prompt);
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 500);
		});
		setIsThinking(false);
	}, []);

	// Resolve selected agent info for panel
	const selectedChar =
		selectedAgentId !== null ? (officeState?.characters.get(selectedAgentId) ?? null) : null;

	const agentInfo = useMemo(() => {
		if (!selectedChar) return null;
		const names: Record<number, { name: string; role: string }> = {
			1: { name: "Manager", role: "orchestrator" },
			2: { name: "CodeBot", role: "coder" },
			3: { name: "ResearchBot", role: "researcher" },
			4: { name: "DevOps", role: "infrastructure" },
		};
		return {
			id: String(selectedChar.id),
			name: names[selectedChar.id]?.name ?? `Agent ${selectedChar.id}`,
			role: names[selectedChar.id]?.role ?? "worker",
			color: `hsl(${selectedChar.hueShift}, 70%, 60%)`,
			status: selectedChar.isActive ? "working" : "idle",
			type: (selectedChar.id === 1 ? "manager" : "worker") as "manager" | "worker",
		};
	}, [selectedChar]);

	// Loading state while tileset initializes
	if (!officeState) {
		return (
			<div className="flex h-full w-full items-center justify-center bg-background">
				<span className="font-mono text-xs text-muted-foreground animate-pulse">
					Loading office...
				</span>
			</div>
		);
	}

	return (
		<div className="relative h-full w-full overflow-hidden bg-background">
			{/* Title overlay */}
			<div className="absolute left-4 top-3 z-30 font-mono">
				<span className="text-[9px] uppercase tracking-widest text-accent-foreground/70">
					AI Office
				</span>
			</div>

			{/* Canvas — fills space above manager bar */}
			<div className="absolute inset-0 bottom-14">
				<OfficeCanvas officeState={officeState} onClickAgent={handleClickAgent} />
			</div>

			{/* Manager bar — fixed bottom */}
			<ManagerBar
				onSubmitTask={handleSubmitTask}
				isThinking={isThinking}
				agentCount={officeState.characters.size}
				sandboxStatus="running"
			/>

			{/* Agent side panel */}
			{agentInfo && (
				<OfficeAgentPanel
					agent={agentInfo}
					tasks={EMPTY_TASKS}
					terminalLines={EMPTY_TERMINAL}
					reasoningSteps={EMPTY_REASONING}
					onClose={handleClosePanel}
				/>
			)}
		</div>
	);
}
