import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent } from "@/components/ui/drawer";
import { AgentReasoning } from "@/lib/agent/AgentReasoning.component";
import { cn } from "@/lib/utils";
import type { AgentReasoningStep } from "@/lib/agent/AgentReasoning.component";
import { PixelAvatar } from "@/lib/pixel/PixelAvatar";
import { PixelBadge } from "@/lib/pixel/PixelBadge";
import { PixelBorderBox } from "@/lib/pixel/PixelBorderBox";
import { PixelDivider } from "@/lib/pixel/PixelDivider";
import { PixelGlow } from "@/lib/pixel/PixelGlow";
import { PixelProgress } from "@/lib/pixel/PixelProgress";
import { PixelText } from "@/lib/pixel/PixelText";
import { TerminalOutput } from "@/lib/terminal/TerminalOutput.component";
import type { TerminalLine } from "@/lib/terminal/TerminalOutput.component";

interface OfficeAgentPanelTask {
	id: string;
	title: string;
	status: string;
}

export interface OfficeAgentPanelDeliverable {
	id: string;
	type: "pdf" | "html" | "markdown" | "url" | "file" | "image";
	title: string;
	filename?: string;
	url?: string;
	mimeType?: string;
	sizeBytes?: number;
}

interface OfficeAgentPanelProps {
	open: boolean;
	agent: {
		id: string;
		name: string;
		role: string;
		color: string;
		status: string;
		type: "manager" | "worker";
	} | null;
	tasks: OfficeAgentPanelTask[];
	terminalLines: TerminalLine[];
	reasoningSteps: AgentReasoningStep[];
	deliverables?: OfficeAgentPanelDeliverable[];
	latestScreenshotUrl?: string | null;
	onClose: () => void;
}

type OfficeAgentPanelTab = "tasks" | "terminal" | "screen" | "reasoning" | "files";

const AGENT_PANEL_STATUS_GLOW: Record<string, "green" | "cyan" | "muted" | "red" | "yellow"> = {
	working: "green",
	coding: "cyan",
	thinking: "cyan",
	idle: "muted",
	done: "green",
	error: "red",
	despawning: "yellow",
};

const AGENT_PANEL_STATUS_BADGE: Record<string, "green" | "cyan" | "muted" | "red" | "yellow"> = {
	working: "green",
	coding: "cyan",
	thinking: "cyan",
	idle: "muted",
	done: "green",
	error: "red",
	despawning: "yellow",
};

export function OfficeAgentPanel({
	open,
	agent,
	tasks,
	terminalLines,
	reasoningSteps,
	deliverables,
	latestScreenshotUrl,
	onClose,
}: OfficeAgentPanelProps) {
	const [activeTab, setActiveTab] = useState<OfficeAgentPanelTab>("tasks");

	const glowColor = agent ? (AGENT_PANEL_STATUS_GLOW[agent.status] ?? "muted") : "muted";
	const badgeColor = agent ? (AGENT_PANEL_STATUS_BADGE[agent.status] ?? "muted") : "muted";
	const isPulsing =
		agent?.status === "working" || agent?.status === "thinking" || agent?.status === "coding";

	const tabs: OfficeAgentPanelTab[] = ["tasks", "terminal", "screen", "reasoning"];
	if (deliverables && deliverables.length > 0) {
		tabs.push("files");
	}

	return (
		<Drawer
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
			modal={false}
		>
			<DrawerContent side="right" backdrop={false} className="flex flex-col">
				{agent && (
					<>
						{/* Header */}
						<div className="flex items-center justify-between p-4">
							<div className="flex items-center gap-3">
								<PixelAvatar
									initials={agent.name[0]}
									color={agent.color}
									size="lg"
									status={isPulsing ? "active" : agent.status === "error" ? "error" : "idle"}
								/>
								<div>
									<div className="flex items-center gap-2">
										<PixelText variant="heading">{agent.name}</PixelText>
										<PixelGlow color={glowColor} size="sm" pulse={isPulsing} />
									</div>
									<div className="flex items-center gap-1.5">
										<PixelText variant="id">{agent.role}</PixelText>
										<PixelBadge color={badgeColor} size="sm">
											{agent.status}
										</PixelBadge>
									</div>
								</div>
							</div>
							<DrawerClose
								render={
									<Button variant="default" size="icon-xs" className="text-muted-foreground" />
								}
							>
								&times;
							</DrawerClose>
						</div>

						<PixelDivider />

						{/* Tabs */}
						<div className="flex">
							{tabs.map((tab) => (
								<Button
									variant="ghost"
									key={tab}
									onClick={() => setActiveTab(tab)}
									className={cn(
										"flex-1 rounded-none px-3 py-2 font-mono text-[8px] uppercase tracking-widest",
										activeTab === tab
											? "border-b-2 border-accent-foreground text-accent-foreground"
											: "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
									)}
								>
									{tab}
								</Button>
							))}
						</div>

						<PixelDivider />

						{/* Content */}
						<div className="flex-1 overflow-auto p-4">
							{activeTab === "tasks" && <OfficeAgentPanelTasks tasks={tasks} />}
							{activeTab === "terminal" && (
								<TerminalOutput
									lines={terminalLines}
									title={`${agent.name} output`}
									status={isPulsing ? "streaming" : "connected"}
									className="h-full"
								/>
							)}
							{activeTab === "screen" && (
								<OfficeAgentPanelScreen screenshotUrl={latestScreenshotUrl ?? null} />
							)}
							{activeTab === "reasoning" && (
								<AgentReasoning steps={reasoningSteps} title={`${agent.name} reasoning`} />
							)}
							{activeTab === "files" && (
								<OfficeAgentPanelDeliverables deliverables={deliverables ?? []} />
							)}
						</div>
					</>
				)}
			</DrawerContent>
		</Drawer>
	);
}

// ─── Tasks sub-component ────────────────────────────────────────

const AGENT_PANEL_TASK_BADGE_COLOR: Record<
	string,
	"muted" | "yellow" | "orange" | "blue" | "green" | "red"
> = {
	backlog: "muted",
	todo: "yellow",
	in_progress: "orange",
	review: "blue",
	done: "green",
	failed: "red",
};

function OfficeAgentPanelTasks({ tasks }: { tasks: OfficeAgentPanelTask[] }) {
	if (tasks.length === 0) {
		return (
			<PixelBorderBox variant="dashed" className="p-4">
				<PixelText variant="id" color="muted">
					No tasks assigned yet
				</PixelText>
			</PixelBorderBox>
		);
	}

	const doneCount = tasks.filter((t) => t.status === "done").length;

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<PixelProgress
					value={doneCount}
					max={tasks.length}
					segments={Math.min(tasks.length, 8)}
					color="orange"
					showLabel
					size="sm"
					className="flex-1"
				/>
			</div>
			{tasks.map((t) => (
				<PixelBorderBox key={t.id} className="px-3 py-2">
					<div className="flex items-center justify-between gap-2">
						<PixelText variant="body" className="text-[9px]">
							{t.title}
						</PixelText>
						<PixelBadge color={AGENT_PANEL_TASK_BADGE_COLOR[t.status] ?? "muted"} size="sm">
							{t.status.replace("_", " ")}
						</PixelBadge>
					</div>
				</PixelBorderBox>
			))}
		</div>
	);
}

// ─── Screen sub-component ───────────────────────────────────────

function OfficeAgentPanelScreen({ screenshotUrl }: { screenshotUrl: string | null }) {
	if (!screenshotUrl) {
		return (
			<PixelBorderBox variant="dashed" className="flex items-center justify-center p-8">
				<div className="space-y-2 text-center">
					<PixelText variant="id" color="muted">
						No screenshots yet
					</PixelText>
					<PixelText variant="body" color="muted" className="text-[9px]">
						Screenshots appear here when the agent uses computer vision
					</PixelText>
				</div>
			</PixelBorderBox>
		);
	}

	return (
		<PixelBorderBox elevation="floating" className="overflow-hidden bg-black p-1">
			<img
				src={screenshotUrl}
				alt="Agent screen"
				className="h-auto w-full border-2 border-border object-contain"
			/>
			<div className="mt-1 flex items-center justify-between px-1">
				<PixelGlow color="green" pulse size="sm" />
				<PixelText variant="id" color="muted">
					LIVE VIEW
				</PixelText>
			</div>
		</PixelBorderBox>
	);
}

// ─── Deliverables sub-component ─────────────────────────────────

const DELIVERABLE_TYPE_ICON: Record<string, string> = {
	pdf: "PDF",
	html: "HTML",
	markdown: "MD",
	url: "URL",
	file: "FILE",
	image: "IMG",
};

const DELIVERABLE_TYPE_BADGE: Record<
	string,
	"red" | "orange" | "cyan" | "blue" | "green" | "muted"
> = {
	pdf: "red",
	html: "orange",
	markdown: "cyan",
	url: "blue",
	image: "green",
	file: "muted",
};

function formatFileSize(bytes?: number): string {
	if (!bytes) return "";
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function OfficeAgentPanelDeliverables({
	deliverables,
}: {
	deliverables: OfficeAgentPanelDeliverable[];
}) {
	if (deliverables.length === 0) {
		return (
			<PixelBorderBox variant="dashed" className="p-4">
				<PixelText variant="id" color="muted">
					No deliverables yet
				</PixelText>
			</PixelBorderBox>
		);
	}

	return (
		<div className="space-y-2">
			<PixelText variant="id" color="muted">
				{deliverables.length} file{deliverables.length !== 1 ? "s" : ""}
			</PixelText>
			{deliverables.map((d) => (
				<PixelBorderBox key={d.id} className="px-3 py-2">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2 overflow-hidden">
							<PixelBadge color={DELIVERABLE_TYPE_BADGE[d.type] ?? "muted"} size="sm">
								{DELIVERABLE_TYPE_ICON[d.type] ?? "FILE"}
							</PixelBadge>
							<div className="min-w-0 flex-1">
								<PixelText variant="body" className="truncate text-[9px]">
									{d.title}
								</PixelText>
								{d.sizeBytes != null && (
									<PixelText variant="id" color="muted" className="text-[7px]">
										{formatFileSize(d.sizeBytes)}
									</PixelText>
								)}
							</div>
						</div>
						{d.url && (
							<a
								href={d.url}
								target="_blank"
								rel="noopener noreferrer"
								download={d.filename}
								className="flex-shrink-0 font-mono text-[8px] text-accent-foreground hover:underline"
							>
								DL
							</a>
						)}
					</div>
				</PixelBorderBox>
			))}
		</div>
	);
}
