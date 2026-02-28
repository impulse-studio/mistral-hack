import { api } from "@mistral-hack/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { OfficeAgentPanel } from "@/components/office/OfficeAgentPanel.component";
import { OfficeCanvas } from "@/components/office/OfficeCanvas.component";
import { ManagerBar } from "@/lib/manager/ManagerBar.component";
import { initTileset } from "@/lib/pixelAgents/initTileset";
import { OfficeState } from "@/lib/pixelAgents/officeState";

const EMPTY_TASKS: never[] = [];
const EMPTY_TERMINAL: never[] = [];
const EMPTY_REASONING: never[] = [];

/** Map desk position to canvas chair UID */
function deskPositionToChairUid(position: { x: number; y: number }, label?: string): string {
	if (label === "manager") return "chair-mgr";
	// Workers: position x=1..4, y=1..2 → chair-1..chair-8
	const index = (position.y - 1) * 4 + position.x;
	return `chair-${index}`;
}

export const Route = createFileRoute("/office")({
	component: OfficePage,
});

function OfficePage() {
	const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
	const [isThinking, setIsThinking] = useState(false);
	const [tilesetReady, setTilesetReady] = useState(false);
	const [threadId, setThreadId] = useState<string | null>(() => {
		if (typeof window === "undefined") return null;
		return sessionStorage.getItem("office-thread-id");
	});
	const officeRef = useRef<OfficeState | null>(null);
	const agentMapRef = useRef(new Map<string, number>()); // convex agent _id → canvas id
	const nextCanvasIdRef = useRef(1);
	const initCalledRef = useRef(false);

	// ── Convex mutations ──
	const initDesks = useMutation(api.office.mutations.initDesks);
	const ensureManager = useMutation(api.office.mutations.ensureManager);
	const createThread = useMutation(api.chat.createNewThread);
	const sendMessage = useMutation(api.chat.sendMessage);

	// ── Convex subscriptions ──
	const convexOffice = useQuery(api.office.queries.getOfficeState);

	// Initialize tileset (floor patterns + wall sprites) before creating OfficeState
	useEffect(() => {
		initTileset(true).then(() => setTilesetReady(true));
	}, []);

	// Create OfficeState once tileset is ready
	if (tilesetReady && !officeRef.current) {
		officeRef.current = new OfficeState();
	}
	const officeState = officeRef.current;

	// ── Init sequence: create desks + ensure manager in Convex ──
	useEffect(() => {
		if (!officeState || initCalledRef.current) return;
		initCalledRef.current = true;

		(async () => {
			try {
				await initDesks();
				await ensureManager();
			} catch (e) {
				// Idempotent — ignore "already exists" errors
				console.debug("[Office] Init:", e);
			}
		})();
	}, [officeState, initDesks, ensureManager]);

	// ── Real-time agent sync: Convex → Canvas ──
	useEffect(() => {
		if (!convexOffice || !officeRef.current) return;
		const os = officeRef.current;
		const { agents, desks } = convexOffice;

		// Build desk lookup by ID
		const deskById = new Map(desks.map((d) => [d._id, d]));

		const activeConvexIds = new Set<string>();

		for (const agent of agents) {
			// Skip fully completed/despawning agents
			if (agent.status === "completed" || agent.status === "despawning") continue;
			activeConvexIds.add(agent._id);

			// Resolve chair UID from desk
			const desk = agent.deskId ? deskById.get(agent.deskId) : null;
			const chairUid = desk ? deskPositionToChairUid(desk.position, desk.label) : undefined;

			if (!agentMapRef.current.has(agent._id)) {
				// New agent → spawn on canvas
				const canvasId = nextCanvasIdRef.current++;
				agentMapRef.current.set(agent._id, canvasId);

				const isManager = agent.type === "manager";
				const palette = canvasId % 6;
				const hue = canvasId * 60;

				os.addAgent(canvasId, palette, hue, chairUid, isManager);
			}

			// Sync active state
			const canvasId = agentMapRef.current.get(agent._id)!;
			const isActive = agent.status === "working" || agent.status === "thinking";
			os.setAgentActive(canvasId, isActive);
		}

		// Remove agents no longer in Convex
		for (const [convexId, canvasId] of agentMapRef.current) {
			if (!activeConvexIds.has(convexId)) {
				os.removeAgent(canvasId);
				agentMapRef.current.delete(convexId);
			}
		}
	}, [convexOffice]);

	// Agent click handler
	const handleClickAgent = useCallback((agentId: number) => {
		setSelectedAgentId(agentId >= 0 ? agentId : null);
	}, []);

	const handleClosePanel = useCallback(() => {
		setSelectedAgentId(null);
	}, []);

	// ── Send task to manager via Convex chat ──
	const handleSubmitTask = useCallback(
		async (prompt: string) => {
			setIsThinking(true);
			try {
				let tid = threadId;
				if (!tid) {
					tid = await createThread();
					setThreadId(tid);
					sessionStorage.setItem("office-thread-id", tid);
				}
				await sendMessage({ threadId: tid, prompt, channel: "web" });
			} catch (e) {
				console.error("[Office] Send failed:", e);
			} finally {
				setIsThinking(false);
			}
		},
		[threadId, createThread, sendMessage],
	);

	// ── Resolve selected agent info for panel ──
	const selectedChar =
		selectedAgentId !== null ? (officeState?.characters.get(selectedAgentId) ?? null) : null;

	// Build reverse map: canvas ID → convex agent data
	const selectedConvexAgent = useMemo(() => {
		if (selectedAgentId === null || !convexOffice) return null;
		for (const [convexId, canvasId] of agentMapRef.current) {
			if (canvasId === selectedAgentId) {
				return convexOffice.agents.find((a) => a._id === convexId) ?? null;
			}
		}
		return null;
	}, [selectedAgentId, convexOffice]);

	const agentInfo = useMemo(() => {
		if (!selectedChar) return null;
		const convex = selectedConvexAgent;
		return {
			id: convex?._id ?? String(selectedChar.id),
			name: convex?.name ?? `Agent ${selectedChar.id}`,
			role: convex?.role ?? "worker",
			color: convex?.color ?? `hsl(${selectedChar.hueShift}, 70%, 60%)`,
			status: selectedChar.isActive ? "working" : "idle",
			type: (convex?.type ?? "worker") as "manager" | "worker",
		};
	}, [selectedChar, selectedConvexAgent]);

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
