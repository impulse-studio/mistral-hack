import { api } from "@mistral-hack/backend/convex/_generated/api";
import { useAction } from "convex/react";
import { Delete, Loader, Monitor, Play } from "pixelarticons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PixelBadge } from "@/lib/pixel/PixelBadge";
import { PixelBorderBox } from "@/lib/pixel/PixelBorderBox";
import { PixelGlow } from "@/lib/pixel/PixelGlow";
import { PixelText } from "@/lib/pixel/PixelText";

import type { SnapshotInfo } from "@/components/snapshot/SnapshotList.component";

const imgStyle: React.CSSProperties = { imageRendering: "auto" };

// ── Types ──────────────────────────────────────────────────

type ViewerState = "idle" | "launching" | "starting-cu" | "running" | "stopping" | "stopped";

interface SandboxViewerProps {
	initialSnapshotName?: string | null;
	availableSnapshots: SnapshotInfo[];
}

// ── Key mapping ────────────────────────────────────────────

const KEY_MAP: Record<string, string> = {
	Enter: "Return",
	Backspace: "BackSpace",
	Tab: "Tab",
	Escape: "Escape",
	Delete: "Delete",
	ArrowUp: "Up",
	ArrowDown: "Down",
	ArrowLeft: "Left",
	ArrowRight: "Right",
	Home: "Home",
	End: "End",
	PageUp: "Page_Up",
	PageDown: "Page_Down",
	Insert: "Insert",
	F1: "F1",
	F2: "F2",
	F3: "F3",
	F4: "F4",
	F5: "F5",
	F6: "F6",
	F7: "F7",
	F8: "F8",
	F9: "F9",
	F10: "F10",
	F11: "F11",
	F12: "F12",
	" ": "space",
};

function isModifierKey(key: string): boolean {
	return ["Control", "Alt", "Shift", "Meta"].includes(key);
}

// ── Component ──────────────────────────────────────────────

export function SnapshotSandboxViewer({
	initialSnapshotName,
	availableSnapshots,
}: SandboxViewerProps) {
	const createTemplateSandbox = useAction(api.debug.createTemplateSandbox);
	const destroyTemplateSandbox = useAction(api.debug.destroyTemplateSandbox);
	const viewerStartComputerUse = useAction(api.debug.viewerStartComputerUse);
	const viewerTakeScreenshot = useAction(api.debug.viewerTakeScreenshot);
	const viewerMouseClick = useAction(api.debug.viewerMouseClick);
	const viewerMouseMove = useAction(api.debug.viewerMouseMove);
	const viewerMouseScroll = useAction(api.debug.viewerMouseScroll);
	const viewerKeyboardType = useAction(api.debug.viewerKeyboardType);
	const viewerKeyboardPress = useAction(api.debug.viewerKeyboardPress);
	const viewerGetDisplayInfo = useAction(api.debug.viewerGetDisplayInfo);

	const [state, setState] = useState<ViewerState>("idle");
	const [selectedSnapshot, setSelectedSnapshot] = useState<string>(initialSnapshotName ?? "");
	const [daytonaId, setDaytonaId] = useState<string | null>(null);
	const [screenshot, setScreenshot] = useState<string | null>(null);
	const [displaySize, setDisplaySize] = useState({ width: 1024, height: 768 });
	const [kbdFocused, setKbdFocused] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const containerRef = useRef<HTMLDivElement>(null);
	const imgRef = useRef<HTMLImageElement>(null);
	const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const daytonaIdRef = useRef<string | null>(null);
	const typingBufferRef = useRef<string>("");
	const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastMoveRef = useRef<number>(0);

	// Keep ref in sync
	useEffect(() => {
		daytonaIdRef.current = daytonaId;
	}, [daytonaId]);

	// Sync initial snapshot
	useEffect(() => {
		if (initialSnapshotName) {
			setSelectedSnapshot(initialSnapshotName);
		}
	}, [initialSnapshotName]);

	// ── Screenshot polling ──────────────────────────────────

	const startPolling = useCallback(
		(id: string) => {
			if (pollingRef.current) clearInterval(pollingRef.current);
			pollingRef.current = setInterval(async () => {
				try {
					const result = (await viewerTakeScreenshot({
						daytonaId: id,
						quality: 50,
						scale: 1,
					})) as { screenshot: string };
					if (result.screenshot) {
						setScreenshot(result.screenshot);
					}
				} catch {
					// Ignore transient polling errors
				}
			}, 500);
		},
		[viewerTakeScreenshot],
	);

	const stopPolling = useCallback(() => {
		if (pollingRef.current) {
			clearInterval(pollingRef.current);
			pollingRef.current = null;
		}
	}, []);

	// ── Launch flow ─────────────────────────────────────────

	const handleLaunch = async () => {
		setError(null);
		setState("launching");
		try {
			const result = (await createTemplateSandbox({
				snapshotName: selectedSnapshot || undefined,
			})) as { daytonaId: string };
			const id = result.daytonaId;
			setDaytonaId(id);

			setState("starting-cu");
			await viewerStartComputerUse({ daytonaId: id });

			// Get display dimensions
			try {
				const displayResult = (await viewerGetDisplayInfo({ daytonaId: id })) as {
					displays: Array<{ width: number; height: number }>;
				};
				if (displayResult.displays?.[0]) {
					setDisplaySize({
						width: displayResult.displays[0].width,
						height: displayResult.displays[0].height,
					});
				}
			} catch {
				// Fallback to defaults
			}

			setState("running");
			startPolling(id);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setState("idle");
		}
	};

	// ── Destroy flow ────────────────────────────────────────

	const handleDestroy = useCallback(async () => {
		const id = daytonaIdRef.current;
		if (!id) return;

		stopPolling();
		setState("stopping");
		try {
			await destroyTemplateSandbox({ daytonaId: id });
		} catch {
			// Best effort
		}
		setDaytonaId(null);
		setScreenshot(null);
		setState("stopped");
	}, [destroyTemplateSandbox, stopPolling]);

	// ── Cleanup on unmount ──────────────────────────────────

	useEffect(() => {
		return () => {
			stopPolling();
			const id = daytonaIdRef.current;
			if (id) {
				destroyTemplateSandbox({ daytonaId: id }).catch(() => {});
			}
		};
	}, [destroyTemplateSandbox, stopPolling]);

	// Safety net: beforeunload
	useEffect(() => {
		const handler = () => {
			const id = daytonaIdRef.current;
			if (id) {
				// Fire-and-forget
				destroyTemplateSandbox({ daytonaId: id }).catch(() => {});
			}
		};
		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [destroyTemplateSandbox]);

	// ── Coordinate transform ────────────────────────────────

	const transformCoords = useCallback(
		(clientX: number, clientY: number) => {
			const img = imgRef.current;
			if (!img) return { x: 0, y: 0 };

			const rect = img.getBoundingClientRect();
			const scaleX = displaySize.width / rect.width;
			const scaleY = displaySize.height / rect.height;

			return {
				x: Math.round((clientX - rect.left) * scaleX),
				y: Math.round((clientY - rect.top) * scaleY),
			};
		},
		[displaySize],
	);

	// ── Mouse handlers ──────────────────────────────────────

	const handleClick = useCallback(
		(e: React.MouseEvent) => {
			if (state !== "running" || !daytonaId) return;
			const { x, y } = transformCoords(e.clientX, e.clientY);
			viewerMouseClick({ daytonaId, x, y }).catch(() => {});
		},
		[state, daytonaId, transformCoords, viewerMouseClick],
	);

	const handleDoubleClick = useCallback(
		(e: React.MouseEvent) => {
			if (state !== "running" || !daytonaId) return;
			const { x, y } = transformCoords(e.clientX, e.clientY);
			viewerMouseClick({ daytonaId, x, y, double: true }).catch(() => {});
		},
		[state, daytonaId, transformCoords, viewerMouseClick],
	);

	const handleContextMenu = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			if (state !== "running" || !daytonaId) return;
			const { x, y } = transformCoords(e.clientX, e.clientY);
			viewerMouseClick({ daytonaId, x, y, button: "right" }).catch(() => {});
		},
		[state, daytonaId, transformCoords, viewerMouseClick],
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (state !== "running" || !daytonaId) return;
			const now = Date.now();
			if (now - lastMoveRef.current < 100) return;
			lastMoveRef.current = now;
			const { x, y } = transformCoords(e.clientX, e.clientY);
			viewerMouseMove({ daytonaId, x, y }).catch(() => {});
		},
		[state, daytonaId, transformCoords, viewerMouseMove],
	);

	const handleWheel = useCallback(
		(e: React.WheelEvent) => {
			if (state !== "running" || !daytonaId) return;
			e.preventDefault();
			const { x, y } = transformCoords(e.clientX, e.clientY);
			const direction = e.deltaY > 0 ? "down" : "up";
			viewerMouseScroll({ daytonaId, x, y, direction, amount: 3 }).catch(() => {});
		},
		[state, daytonaId, transformCoords, viewerMouseScroll],
	);

	// ── Keyboard handlers ───────────────────────────────────

	const flushTypingBuffer = useCallback(() => {
		const text = typingBufferRef.current;
		const id = daytonaIdRef.current;
		if (text && id) {
			viewerKeyboardType({ daytonaId: id, text }).catch(() => {});
		}
		typingBufferRef.current = "";
	}, [viewerKeyboardType]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (state !== "running" || !daytonaId) return;
			e.preventDefault();
			e.stopPropagation();

			if (isModifierKey(e.key)) return;

			const modifiers: string[] = [];
			if (e.ctrlKey) modifiers.push("ctrl");
			if (e.altKey) modifiers.push("alt");
			if (e.shiftKey) modifiers.push("shift");
			if (e.metaKey) modifiers.push("super");

			// Modifier combos or special keys → keyboardPress
			const mappedKey = KEY_MAP[e.key];
			if (modifiers.length > 0 || mappedKey) {
				flushTypingBuffer();
				const key = mappedKey ?? e.key;
				viewerKeyboardPress({
					daytonaId,
					key,
					modifiers: modifiers.length > 0 ? modifiers : undefined,
				}).catch(() => {});
				return;
			}

			// Printable character → buffer + batch
			if (e.key.length === 1) {
				typingBufferRef.current += e.key;
				if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
				typingTimerRef.current = setTimeout(flushTypingBuffer, 50);
			}
		},
		[state, daytonaId, viewerKeyboardPress, flushTypingBuffer],
	);

	// ── Render ──────────────────────────────────────────────

	const isActive = state === "running" || state === "launching" || state === "starting-cu";

	return (
		<div className="space-y-4">
			{/* Status bar */}
			<PixelBorderBox className="p-3 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<PixelGlow
						color={
							state === "running"
								? "green"
								: state === "launching" || state === "starting-cu"
									? "orange"
									: "muted"
						}
						pulse={state === "launching" || state === "starting-cu"}
						size="md"
					/>
					<div className="flex items-center gap-2">
						<PixelText variant="label" className="text-xs uppercase">
							{state === "idle" && "Ready to launch"}
							{state === "launching" && "Creating sandbox..."}
							{state === "starting-cu" && "Starting Computer Use..."}
							{state === "running" && "Live"}
							{state === "stopping" && "Destroying..."}
							{state === "stopped" && "Stopped"}
						</PixelText>
						{daytonaId && (
							<PixelBadge color="muted" variant="outline" size="sm">
								{daytonaId.slice(0, 12)}
							</PixelBadge>
						)}
						{kbdFocused && state === "running" && (
							<PixelBadge color="cyan" size="sm">
								KBD ACTIVE
							</PixelBadge>
						)}
					</div>
				</div>
				{isActive && (
					<button
						type="button"
						onClick={handleDestroy}
						className="h-7 px-3 text-[10px] font-mono uppercase tracking-widest border border-red-500/50 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1"
					>
						<Delete className="h-3 w-3" />
						Destroy
					</button>
				)}
			</PixelBorderBox>

			{/* Idle — snapshot selection + launch */}
			{(state === "idle" || state === "stopped") && (
				<PixelBorderBox elevation="raised" className="p-6 space-y-4">
					<div className="flex items-center gap-2">
						<Monitor className="h-5 w-5" />
						<PixelText variant="heading" className="text-sm">
							Launch Sandbox
						</PixelText>
					</div>

					<div className="space-y-2">
						<label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
							Select Snapshot
						</label>
						<select
							value={selectedSnapshot}
							onChange={(e) => setSelectedSnapshot(e.target.value)}
							className="w-full h-8 px-3 text-xs font-mono bg-background border-2 border-border focus:border-foreground outline-none transition-colors"
						>
							<option value="">No snapshot (default TypeScript image)</option>
							{availableSnapshots
								.filter((s) => s.state.toLowerCase() === "active")
								.map((s) => (
									<option key={s.id} value={s.name}>
										{s.name} ({s.imageName})
									</option>
								))}
						</select>
					</div>

					{error && (
						<div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 p-2 break-all">
							{error}
						</div>
					)}

					<button
						type="button"
						onClick={handleLaunch}
						className="w-full h-9 text-xs font-mono uppercase tracking-widest border-2 border-cyan-500 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors flex items-center justify-center gap-2"
					>
						<Play className="h-4 w-4" />
						Launch Sandbox
					</button>
				</PixelBorderBox>
			)}

			{/* Launching / Starting CU */}
			{(state === "launching" || state === "starting-cu") && (
				<PixelBorderBox elevation="floating" className="p-12 flex flex-col items-center gap-4">
					<Loader className="h-8 w-8 animate-spin text-orange-400" />
					<PixelText variant="body" className="text-sm">
						{state === "launching"
							? "Creating sandbox and provisioning..."
							: "Starting Computer Use (Xvfb + Desktop)..."}
					</PixelText>
					<PixelText variant="id">This may take 30-60 seconds</PixelText>
				</PixelBorderBox>
			)}

			{/* Running — screenshot display */}
			{state === "running" && (
				<PixelBorderBox elevation="floating" className="p-0 overflow-hidden">
					{/* biome-ignore lint/a11y/noNoninteractiveTabindex: needed for keyboard capture */}
					<div
						ref={containerRef}
						tabIndex={0}
						onFocus={() => setKbdFocused(true)}
						onBlur={() => setKbdFocused(false)}
						onKeyDown={handleKeyDown}
						className={`relative cursor-crosshair outline-none ${
							kbdFocused ? "ring-2 ring-cyan-500/50" : ""
						}`}
					>
						{screenshot ? (
							<img
								ref={imgRef}
								src={`data:image/jpeg;base64,${screenshot}`}
								alt="Sandbox desktop"
								className="w-full h-auto block"
								style={imgStyle}
								onClick={handleClick}
								onDoubleClick={handleDoubleClick}
								onContextMenu={handleContextMenu}
								onMouseMove={handleMouseMove}
								onWheel={handleWheel}
								draggable={false}
							/>
						) : (
							<div className="flex items-center justify-center h-[400px] text-muted-foreground">
								<Loader className="h-6 w-6 animate-spin mr-2" />
								<PixelText variant="body">Waiting for first screenshot...</PixelText>
							</div>
						)}

						{/* Click-to-focus hint */}
						{!kbdFocused && screenshot && (
							<div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/80 border border-border px-3 py-1">
								<PixelText variant="id" className="text-[10px]">
									Click to enable keyboard input
								</PixelText>
							</div>
						)}
					</div>
				</PixelBorderBox>
			)}

			{/* Stopping */}
			{state === "stopping" && (
				<PixelBorderBox className="p-8 flex items-center justify-center gap-3">
					<Loader className="h-5 w-5 animate-spin" />
					<PixelText variant="body">Destroying sandbox...</PixelText>
				</PixelBorderBox>
			)}
		</div>
	);
}
