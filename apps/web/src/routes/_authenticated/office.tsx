import { api } from "@mistral-hack/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PixelAvatar } from "@/components/PixelAvatar";
import { OfficeAgentPanel } from "@/components/office/OfficeAgentPanel.component";
import { OfficeCanvas } from "@/components/office/OfficeCanvas.component";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";
import { MasterAgentPanel } from "@/lib/master-agent-panel/MasterAgentPanel.component";
import { initTileset } from "@/lib/pixelAgents/initTileset";
import { OfficeState } from "@/lib/pixelAgents/officeState";

interface ConvexDesk {
	_id: string;
	position: { x: number; y: number };
	label?: string;
	occupiedBy?: string;
}

interface ConvexAgent {
	_id: string;
	name: string;
	type: string;
	role: string;
	status: string;
	deskId?: string;
}

const EMPTY_TASKS: never[] = [];
const EMPTY_TERMINAL: never[] = [];
const EMPTY_REASONING: never[] = [];

/** Reserved canvas ID for the always-present manager character */
const MANAGER_CANVAS_ID = 0;

/** Map desk position to canvas chair UID */
function deskPositionToChairUid(position: { x: number; y: number }, label?: string): string {
	if (label === "manager") return "chair-mgr";
	// Workers: position x=1..4, y=1..2 → chair-1..chair-8
	const index = (position.y - 1) * 4 + position.x;
	return `chair-${index}`;
}

export const Route = createFileRoute("/_authenticated/office")({
	component: OfficeContent,
});

function OfficeContent() {
	const user = useQuery(api.auth.getCurrentUser);

	const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
	const [showManagerModal, setShowManagerModal] = useState(false);
	const [tilesetReady, setTilesetReady] = useState(false);
	const officeRef = useRef<OfficeState | null>(null);
	const agentMapRef = useRef(new Map<string, number>()); // convex agent _id → canvas id
	const nextCanvasIdRef = useRef(1);
	const initCalledRef = useRef(false);

	// ── Convex mutations ──
	const initDesks = useMutation(api.office.mutations.initDesks);
	const ensureManager = useMutation(api.office.mutations.ensureManager);

	// ── Convex subscriptions ──
	const convexOffice = useQuery(api.office.queries.getOfficeState);

	// Initialize tileset (floor patterns + wall sprites) before creating OfficeState
	useEffect(() => {
		initTileset(true).then(() => setTilesetReady(true));
	}, []);

	// Create OfficeState once tileset is ready, spawn permanent manager character
	if (tilesetReady && !officeRef.current) {
		const os = new OfficeState();
		os.addAgent(MANAGER_CANVAS_ID, 0, 0, "chair-mgr", true);
		officeRef.current = os;
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
		const deskById = new Map<string, ConvexDesk>(desks.map((d: ConvexDesk) => [d._id, d]));

		const activeConvexIds = new Set<string>();

		for (const agent of agents) {
			// Skip fully completed/despawning agents
			if (agent.status === "completed" || agent.status === "despawning") continue;
			activeConvexIds.add(agent._id);

			// Manager agents from Convex map to the permanent local manager character
			// Manager is always visually active (screen on) since they're always at their desk
			if (agent.type === "manager") {
				agentMapRef.current.set(agent._id, MANAGER_CANVAS_ID);
				os.setAgentActive(MANAGER_CANVAS_ID, true);
				continue;
			}

			// Resolve chair UID from desk
			const desk = agent.deskId ? deskById.get(agent.deskId) : null;
			const chairUid = desk ? deskPositionToChairUid(desk.position, desk.label) : undefined;

			if (!agentMapRef.current.has(agent._id)) {
				// New agent → spawn on canvas
				const canvasId = nextCanvasIdRef.current++;
				agentMapRef.current.set(agent._id, canvasId);

				const palette = canvasId % 6;
				const hue = canvasId * 60;

				os.addAgent(canvasId, palette, hue, chairUid);
			}

			// Sync active state
			const canvasId = agentMapRef.current.get(agent._id)!;
			const isActive = agent.status === "working" || agent.status === "thinking";
			os.setAgentActive(canvasId, isActive);
		}

		// Remove agents no longer in Convex (never remove the permanent manager)
		for (const [convexId, canvasId] of agentMapRef.current) {
			if (!activeConvexIds.has(convexId)) {
				if (canvasId === MANAGER_CANVAS_ID) continue;
				os.removeAgent(canvasId);
				agentMapRef.current.delete(convexId);
			}
		}
	}, [convexOffice]);

	// Agent click handler — manager opens modal, others open side panel
	const handleClickAgent = useCallback((agentId: number) => {
		if (agentId === MANAGER_CANVAS_ID) {
			setSelectedAgentId(null);
			setShowManagerModal(true);
			return;
		}
		setSelectedAgentId(agentId >= 0 ? agentId : null);
	}, []);

	const handleClosePanel = useCallback(() => {
		setSelectedAgentId(null);
	}, []);

	// ── Resolve selected agent info for panel ──
	const selectedChar =
		selectedAgentId !== null ? (officeState?.characters.get(selectedAgentId) ?? null) : null;

	// Build reverse map: canvas ID → convex agent data
	const selectedConvexAgent = useMemo(() => {
		if (selectedAgentId === null || !convexOffice) return null;
		for (const [convexId, canvasId] of agentMapRef.current) {
			if (canvasId === selectedAgentId) {
				return convexOffice.agents.find((a: ConvexAgent) => a._id === convexId) ?? null;
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
			{/* Title + logout overlay */}
			<div className="absolute px-4 w-full top-0 h-12 z-30 flex items-center justify-between font-mono bg-black">
				{user && (
					<div className="flex items-center gap-2.5">
						<PixelAvatar src={user.image} size={28} />
						<div className="flex flex-col">
							<span className="text-[9px] tracking-widest text-muted-foreground">{user.name}</span>
							<span className="text-[9px] tracking-widest text-muted-foreground">{user.email}</span>
						</div>
					</div>
				)}
				<div className="flex items-center gap-2">
					<Button
						variant="default"
						size="sm"
						onClick={() => {
							authClient.signOut({
								fetchOptions: {
									onSuccess: () => {
										location.reload();
									},
								},
							});
						}}
						className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground"
					>
						Sign Out
					</Button>
				</div>
			</div>

			{/* Canvas — fills entire space */}
			<div className="absolute inset-0">
				<OfficeCanvas officeState={officeState} onClickAgent={handleClickAgent} />
			</div>

			{/* Agent side panel */}
			<OfficeAgentPanel
				open={!!agentInfo}
				agent={agentInfo}
				tasks={EMPTY_TASKS}
				terminalLines={EMPTY_TERMINAL}
				reasoningSteps={EMPTY_REASONING}
				onClose={handleClosePanel}
			/>

			{/* Manager modal */}
			<Dialog open={showManagerModal} onOpenChange={setShowManagerModal}>
				<DialogContent className="flex h-[85vh] w-[90vw] max-w-[1200px] flex-col">
					<DialogHeader>
						<DialogTitle>Manager Office</DialogTitle>
						<DialogClose render={<Button variant="default" size="icon-sm" />}>×</DialogClose>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-hidden p-4">
						<MasterAgentPanel />
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
