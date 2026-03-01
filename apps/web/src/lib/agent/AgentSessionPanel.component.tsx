import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AgentReasoning } from "@/lib/agent/AgentReasoning.component";
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
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────

interface AgentSessionTask {
	id: string;
	title: string;
	status: string;
}

interface AgentSessionAgent {
	id: string;
	name: string;
	role: string;
	color: string;
	status: string;
	type: "manager" | "worker";
}

interface AgentSessionPanelProps {
	agent: AgentSessionAgent;
	tasks: AgentSessionTask[];
	terminalLines: TerminalLine[];
	reasoningSteps: AgentReasoningStep[];
	className?: string;
}

type AgentSessionTab = "terminal" | "tasks" | "reasoning";

// ── Constants ────────────────────────────────────────────

const STATUS_GLOW: Record<string, "green" | "cyan" | "muted" | "red" | "yellow"> = {
	working: "green",
	coding: "cyan",
	thinking: "cyan",
	idle: "muted",
	done: "green",
	completed: "green",
	error: "red",
	failed: "red",
	despawning: "yellow",
};

const STATUS_BADGE: Record<string, "green" | "cyan" | "muted" | "red" | "yellow"> = {
	working: "green",
	coding: "cyan",
	thinking: "cyan",
	idle: "muted",
	done: "green",
	completed: "green",
	error: "red",
	failed: "red",
	despawning: "yellow",
};

const TASK_BADGE_COLOR: Record<string, "muted" | "yellow" | "orange" | "blue" | "green" | "red"> = {
	backlog: "muted",
	todo: "yellow",
	waiting: "blue",
	in_progress: "orange",
	review: "blue",
	done: "green",
	failed: "red",
};

// ── Component ────────────────────────────────────────────

function AgentSessionPanel({
	agent,
	tasks,
	terminalLines,
	reasoningSteps,
	className,
}: AgentSessionPanelProps) {
	const [activeTab, setActiveTab] = useState<AgentSessionTab>("terminal");

	const glowColor = STATUS_GLOW[agent.status] ?? "muted";
	const badgeColor = STATUS_BADGE[agent.status] ?? "muted";
	const isPulsing =
		agent.status === "working" || agent.status === "thinking" || agent.status === "coding";

	const tabs: AgentSessionTab[] = ["terminal", "tasks", "reasoning"];

	return (
		<div className={cn("flex flex-col", className)}>
			{/* Header */}
			<div className="flex items-center gap-3 p-4">
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
				{activeTab === "terminal" && (
					<TerminalOutput
						lines={terminalLines}
						title={`${agent.name} output`}
						status={isPulsing ? "streaming" : "connected"}
						className="h-full"
					/>
				)}
				{activeTab === "tasks" && <AgentSessionTasks tasks={tasks} />}
				{activeTab === "reasoning" && (
					<AgentReasoning steps={reasoningSteps} title={`${agent.name} reasoning`} />
				)}
			</div>
		</div>
	);
}

// ── Tasks sub-component ──────────────────────────────────

function AgentSessionTasks({ tasks }: { tasks: AgentSessionTask[] }) {
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
						<PixelBadge color={TASK_BADGE_COLOR[t.status] ?? "muted"} size="sm">
							{t.status.replace("_", " ")}
						</PixelBadge>
					</div>
				</PixelBorderBox>
			))}
		</div>
	);
}

export { AgentSessionPanel };
export type { AgentSessionPanelProps, AgentSessionAgent, AgentSessionTask };
