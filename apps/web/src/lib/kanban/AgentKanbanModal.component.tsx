import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PixelAvatar } from "@/lib/pixel/PixelAvatar";
import { PixelBadge } from "@/lib/pixel/PixelBadge";
import { PixelBorderBox } from "@/lib/pixel/PixelBorderBox";
import { PixelDivider } from "@/lib/pixel/PixelDivider";
import { PixelGlow } from "@/lib/pixel/PixelGlow";
import { PixelText } from "@/lib/pixel/PixelText";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────

type TaskStatus =
	| "backlog"
	| "todo"
	| "waiting"
	| "in_progress"
	| "review"
	| "done"
	| "failed"
	| "cancelled";

interface AgentTask {
	id: string;
	title: string;
	status: TaskStatus;
}

type AgentStatus = "idle" | "thinking" | "working" | "completed" | "failed" | "despawning";

interface AgentWithTasks {
	id: string;
	name: string;
	role: string;
	color: string;
	status: AgentStatus;
	tasks: AgentTask[];
}

interface AgentKanbanModalProps {
	open: boolean;
	onClose: () => void;
	agents: AgentWithTasks[];
	onTaskClick?: (taskId: string) => void;
	onAgentClick?: (agentId: string) => void;
}

// ── Constants ────────────────────────────────────────────

const STATUS_DISPLAY = {
	backlog: { label: "Backlog", color: "muted" },
	todo: { label: "Todo", color: "orange" },
	waiting: { label: "Waiting", color: "purple" },
	in_progress: { label: "In Progress", color: "cyan" },
	review: { label: "Review", color: "yellow" },
	done: { label: "Done", color: "green" },
	failed: { label: "Failed", color: "red" },
	cancelled: { label: "Cancelled", color: "muted" },
} as const;

const AGENT_GLOW_COLOR = {
	idle: "muted",
	thinking: "yellow",
	working: "cyan",
	completed: "green",
	failed: "red",
	despawning: "muted",
} as const;

const AGENT_GLOW_LABEL: Record<AgentStatus, string> = {
	idle: "idle",
	thinking: "thinking",
	working: "working",
	completed: "done",
	failed: "error",
	despawning: "shutting down",
};

// ── Helpers ──────────────────────────────────────────────

/** Order tasks: active first, then done/failed */
const STATUS_ORDER: TaskStatus[] = [
	"in_progress",
	"review",
	"waiting",
	"todo",
	"backlog",
	"done",
	"failed",
];

function sortTasks(tasks: AgentTask[]): AgentTask[] {
	return [...tasks].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
}

// ── Component ────────────────────────────────────────────

function AgentKanbanModal({
	open,
	onClose,
	agents,
	onTaskClick,
	onAgentClick,
}: AgentKanbanModalProps) {
	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent className="max-h-[85vh] w-full max-w-3xl overflow-y-auto p-0">
				{/* Header */}
				<div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
					<PixelText as="h2" variant="heading">
						Worker Boards
					</PixelText>
					<DialogClose
						render={
							<Button variant="ghost" size="icon-xs" className="border-2 border-border bg-card" />
						}
					>
						&times;
					</DialogClose>
				</div>

				{/* Agent boards */}
				<div className="flex flex-col gap-0 px-4 py-3">
					{agents.length === 0 && (
						<div className="flex items-center justify-center border-2 border-dashed border-border bg-muted/10 py-8">
							<PixelText variant="body" color="muted">
								No active workers
							</PixelText>
						</div>
					)}

					{agents.map((agent, i) => {
						const sorted = sortTasks(agent.tasks);
						const doneCount = agent.tasks.filter(
							(t) => t.status === "done" || t.status === "failed",
						).length;
						const totalCount = agent.tasks.length;

						return (
							<div key={agent.id}>
								{i > 0 && <PixelDivider variant="solid" className="my-3" />}

								{/* Agent header */}
								<div
									className={cn(
										"mb-2 flex items-center gap-2",
										onAgentClick &&
											"cursor-pointer hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px",
									)}
									onClick={() => onAgentClick?.(agent.id)}
								>
									<PixelAvatar
										initials={agent.name.slice(0, 2).toUpperCase()}
										color={agent.color}
										size="md"
									/>
									<div className="flex flex-col">
										<div className="flex items-center gap-2">
											<PixelText variant="label">{agent.name}</PixelText>
											<PixelBadge color="muted" size="sm">
												{agent.role}
											</PixelBadge>
										</div>
										<PixelGlow
											color={AGENT_GLOW_COLOR[agent.status]}
											size="sm"
											label={AGENT_GLOW_LABEL[agent.status]}
											pulse={agent.status === "working" || agent.status === "thinking"}
										/>
									</div>
									<PixelText variant="id" color="muted" className="ml-auto">
										{doneCount}/{totalCount} done
									</PixelText>
								</div>

								{/* Task list */}
								{sorted.length === 0 ? (
									<div className="flex items-center justify-center border-2 border-dashed border-border bg-muted/10 py-3">
										<PixelText variant="body" color="muted">
											No tasks assigned
										</PixelText>
									</div>
								) : (
									<PixelBorderBox className="p-0">
										<ul className="flex flex-col">
											{sorted.map((task, j) => {
												const statusInfo = STATUS_DISPLAY[task.status];
												return (
													<li
														key={task.id}
														className={cn(
															"flex items-center gap-2 px-3 py-1.5 hover:bg-muted/20",
															j > 0 && "border-t border-border",
															onTaskClick && "cursor-pointer",
														)}
														onClick={() => onTaskClick?.(task.id)}
													>
														<PixelBadge
															color={statusInfo.color}
															size="sm"
															variant={task.status === "done" ? "solid" : "outline"}
														>
															{statusInfo.label}
														</PixelBadge>
														<PixelText
															variant="body"
															color={task.status === "done" ? "muted" : "default"}
															className={cn(
																"min-w-0 truncate",
																task.status === "done" && "line-through",
															)}
														>
															{task.title}
														</PixelText>
														<PixelText variant="id" color="muted" className="ml-auto shrink-0">
															{task.id.slice(-4)}
														</PixelText>
													</li>
												);
											})}
										</ul>
									</PixelBorderBox>
								)}
							</div>
						);
					})}
				</div>
			</DialogContent>
		</Dialog>
	);
}

export { AgentKanbanModal as KanbanAgentModal };
export type {
	AgentKanbanModalProps as KanbanAgentModalProps,
	AgentWithTasks as KanbanAgentWithTasks,
	AgentTask as KanbanAgentTask,
};
