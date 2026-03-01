import { useState } from "react";
import { Streamdown } from "streamdown";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { PixelAvatar } from "@/lib/pixel/PixelAvatar";
import { PixelBadge } from "@/lib/pixel/PixelBadge";
import { PixelDivider } from "@/lib/pixel/PixelDivider";
import { PixelGlow } from "@/lib/pixel/PixelGlow";
import { PixelProgress } from "@/lib/pixel/PixelProgress";
import { PixelText } from "@/lib/pixel/PixelText";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────

export interface KanbanKanbanTaskSubtaskItemItem {
	id: string;
	title: string;
	done: boolean;
}

export interface KanbanKanbanTaskComment {
	id: string;
	author: "user" | "manager" | "agent" | "system";
	agentName?: string;
	content: string;
	createdAt: number;
}

export interface KanbanKanbanTaskAssignee {
	name: string;
	initials: string;
	color?: string;
	status?: "idle" | "coding" | "thinking" | "error" | "done";
}

type LabelColor =
	| "blue"
	| "purple"
	| "red"
	| "green"
	| "yellow"
	| "orange"
	| "pink"
	| "cyan"
	| "muted";
type Priority = "urgent" | "high" | "medium" | "low" | "none";

export interface KanbanTaskDetailProps {
	open: boolean;
	onClose: () => void;
	id: string;
	title: string;
	status: "backlog" | "todo" | "in_progress" | "review" | "done" | "failed";
	description?: string;
	priority?: Priority;
	labels?: Array<{ text: string; color: LabelColor }>;
	subtasks?: KanbanTaskSubtaskItem[];
	assignee?: KanbanTaskAssignee;
	reasoning?: string;
	comments?: KanbanTaskComment[];
	result?: string;
	error?: string;
	createdAt?: number;
	startedAt?: number;
	completedAt?: number;
	onAddComment?: (content: string) => void;
	onOpenTerminal?: () => void;
	onOpenFiles?: () => void;
}

// ── Constants ────────────────────────────────────────────

const PRIORITY_COLOR_MAP = {
	urgent: "red",
	high: "orange",
	medium: "yellow",
	low: "muted",
	none: "muted",
} as const;

const AGENT_STATUS_COLOR_MAP = {
	idle: "muted",
	coding: "cyan",
	thinking: "yellow",
	error: "red",
	done: "green",
} as const;

const STATUS_DISPLAY = {
	backlog: { label: "Backlog", color: "muted" },
	todo: { label: "Todo", color: "orange" },
	in_progress: { label: "In Progress", color: "cyan" },
	review: { label: "Review", color: "yellow" },
	done: { label: "Done", color: "green" },
	failed: { label: "Failed", color: "red" },
} as const;

const COMMENT_AUTHOR_LABEL = {
	user: "You",
	manager: "Manager",
	agent: "Agent",
	system: "System",
} as const;

const COMMENT_AUTHOR_COLOR = {
	user: "linear-gradient(135deg, #3B82F6, #6366F1)",
	manager: "linear-gradient(135deg, #F97316, #EF4444)",
	agent: "linear-gradient(135deg, #06B6D4, #22C55E)",
	system: "linear-gradient(135deg, #6B7280, #9CA3AF)",
} as const;

// ── Helpers ──────────────────────────────────────────────

function formatTimestamp(ts: number): string {
	const date = new Date(ts);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMin = Math.floor(diffMs / 60_000);

	if (diffMin < 1) return "just now";
	if (diffMin < 60) return `${diffMin}m ago`;

	const diffHours = Math.floor(diffMin / 60);
	if (diffHours < 24) return `${diffHours}h ago`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `${diffDays}d ago`;

	return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Component ────────────────────────────────────────────

function KanbanTaskDetail({
	open,
	onClose,
	id,
	title,
	status,
	description,
	priority,
	labels,
	subtasks,
	assignee,
	reasoning,
	comments,
	result,
	error,
	createdAt,
	startedAt,
	completedAt,
	onAddComment,
	onOpenTerminal,
	onOpenFiles,
}: KanbanTaskDetailProps) {
	const [commentDraft, setCommentDraft] = useState("");

	const doneCount = subtasks?.filter((s) => s.done).length ?? 0;
	const totalCount = subtasks?.length ?? 0;
	const statusInfo = STATUS_DISPLAY[status];

	const handleSubmitComment = () => {
		const trimmed = commentDraft.trim();
		if (!trimmed || !onAddComment) return;
		onAddComment(trimmed);
		setCommentDraft("");
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			handleSubmitComment();
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent className="max-h-[85vh] w-full max-w-lg overflow-y-auto p-0">
				{/* ── Header ── */}
				<div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
					<div className="flex items-center gap-2">
						<PixelText variant="id">{id}</PixelText>
						<PixelBadge
							color={statusInfo.color}
							variant={status === "done" ? "solid" : "outline"}
							size="sm"
						>
							{statusInfo.label}
						</PixelBadge>
					</div>
					<DialogClose
						render={
							<Button variant="ghost" size="icon-xs" className="border-2 border-border bg-card" />
						}
					>
						&times;
					</DialogClose>
				</div>

				{/* ── Body ── */}
				<div className="flex flex-col gap-0 px-4 py-3">
					{/* Title */}
					<PixelText as="h2" variant="heading" className="mb-1">
						{title}
					</PixelText>

					{/* Priority + labels */}
					{(labels?.length || (priority && priority !== "none")) && (
						<div className="mt-2 flex flex-wrap items-center gap-1.5">
							{priority && priority !== "none" && (
								<PixelBadge color={PRIORITY_COLOR_MAP[priority]} variant="solid" size="sm">
									{priority}
								</PixelBadge>
							)}
							{labels?.map((label) => (
								<PixelBadge key={label.text} color={label.color} variant="outline" size="sm">
									{label.text}
								</PixelBadge>
							))}
						</div>
					)}

					{/* Timestamps row */}
					{(createdAt || startedAt || completedAt) && (
						<div className="mt-3 flex flex-wrap gap-3">
							{createdAt && (
								<PixelText variant="id" color="muted">
									Created {formatTimestamp(createdAt)}
								</PixelText>
							)}
							{startedAt && (
								<PixelText variant="id" color="muted">
									Started {formatTimestamp(startedAt)}
								</PixelText>
							)}
							{completedAt && (
								<PixelText variant="id" color="muted">
									Completed {formatTimestamp(completedAt)}
								</PixelText>
							)}
						</div>
					)}

					{/* Description */}
					{description && (
						<>
							<PixelDivider variant="dashed" className="my-3" />
							<PixelText variant="label" color="muted" className="mb-1.5 block">
								Description
							</PixelText>
							<div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed">
								<Streamdown>{description}</Streamdown>
							</div>
						</>
					)}

					{/* Reasoning */}
					{reasoning && (
						<>
							<PixelDivider variant="dashed" className="my-3" />
							<PixelText variant="label" color="muted" className="mb-1.5 block">
								Reasoning
							</PixelText>
							<PixelText as="p" variant="body" color="muted">
								{reasoning}
							</PixelText>
						</>
					)}

					{/* Result / Error */}
					{result && (
						<>
							<PixelDivider variant="dashed" className="my-3" />
							<PixelText variant="label" color="success" className="mb-1.5 block">
								Result
							</PixelText>
							<div className="border-2 border-green-500/30 bg-green-500/5 p-2">
								<PixelText as="p" variant="body">
									{result}
								</PixelText>
							</div>
						</>
					)}
					{error && (
						<>
							<PixelDivider variant="dashed" className="my-3" />
							<PixelText variant="label" color="error" className="mb-1.5 block">
								Error
							</PixelText>
							<div className="border-2 border-red-500/30 bg-red-500/5 p-2">
								<PixelText as="p" variant="code" color="error">
									{error}
								</PixelText>
							</div>
						</>
					)}

					{/* Subtasks */}
					{subtasks && subtasks.length > 0 && (
						<>
							<PixelDivider variant="dashed" className="my-3" />
							<PixelText variant="label" color="muted" className="mb-1.5 block">
								Subtasks
							</PixelText>
							<PixelProgress
								value={doneCount}
								max={totalCount}
								showLabel
								color={doneCount === totalCount ? "green" : "cyan"}
								className="mb-2"
							/>
							<ul className="flex flex-col gap-1">
								{subtasks.map((subtask) => (
									<li key={subtask.id} className="flex items-center gap-2">
										<div
											className={cn(
												"flex size-3.5 shrink-0 items-center justify-center border-2 border-border font-mono text-[8px]",
												subtask.done && "border-green-500 bg-green-500/20 text-green-500",
											)}
										>
											{subtask.done ? "\u2713" : ""}
										</div>
										<PixelText
											variant="body"
											color={subtask.done ? "muted" : "default"}
											className={cn(subtask.done && "line-through")}
										>
											{subtask.title}
										</PixelText>
									</li>
								))}
							</ul>
						</>
					)}

					{/* Assigned to */}
					{assignee && (
						<>
							<PixelDivider variant="dashed" className="my-3" />
							<PixelText variant="label" color="muted" className="mb-1.5 block">
								Assigned To
							</PixelText>
							<div className="flex items-center gap-2">
								<PixelAvatar initials={assignee.initials} color={assignee.color} size="md" />
								<div className="flex flex-col">
									<PixelText variant="body">{assignee.name}</PixelText>
									{assignee.status && (
										<PixelGlow
											color={AGENT_STATUS_COLOR_MAP[assignee.status]}
											size="sm"
											label={assignee.status}
											pulse={assignee.status === "coding" || assignee.status === "thinking"}
										/>
									)}
								</div>
							</div>
						</>
					)}

					{/* Action buttons */}
					{(onOpenTerminal || onOpenFiles) && (
						<>
							<PixelDivider variant="dashed" className="my-3" />
							<div className="flex items-center gap-2">
								{onOpenTerminal && (
									<Button
										variant="elevated"
										size="sm"
										onClick={onOpenTerminal}
										className="font-mono text-[11px] font-semibold uppercase tracking-widest"
									>
										View Terminal
									</Button>
								)}
								{onOpenFiles && (
									<Button
										variant="elevated"
										size="sm"
										onClick={onOpenFiles}
										className="font-mono text-[11px] font-semibold uppercase tracking-widest"
									>
										View Files
									</Button>
								)}
							</div>
						</>
					)}

					{/* ── Comments ── */}
					<PixelDivider variant="solid" className="my-3" />
					<PixelText variant="label" color="muted" className="mb-2 block">
						Comments{comments?.length ? ` (${comments.length})` : ""}
					</PixelText>

					{/* Comment list */}
					{comments && comments.length > 0 ? (
						<div className="flex flex-col gap-2">
							{comments.map((comment) => (
								<div
									key={comment.id}
									className="border-2 border-border bg-muted/20 p-2"
									data-slot="task-comment"
								>
									<div className="mb-1 flex items-center gap-1.5">
										<PixelAvatar
											initials={
												comment.author === "user"
													? "U"
													: comment.author === "manager"
														? "M"
														: (comment.agentName?.slice(0, 2).toUpperCase() ?? "A")
											}
											color={COMMENT_AUTHOR_COLOR[comment.author]}
											size="xs"
										/>
										<PixelText variant="label" className="text-[9px]">
											{comment.agentName ?? COMMENT_AUTHOR_LABEL[comment.author]}
										</PixelText>
										<PixelText variant="id" color="muted" className="text-[9px]">
											{formatTimestamp(comment.createdAt)}
										</PixelText>
									</div>
									<PixelText as="p" variant="body">
										{comment.content}
									</PixelText>
								</div>
							))}
						</div>
					) : (
						<div className="flex items-center justify-center border-2 border-dashed border-border bg-muted/10 py-4">
							<PixelText variant="body" color="muted">
								No comments yet
							</PixelText>
						</div>
					)}

					{/* Comment input */}
					{onAddComment && (
						<div className="mt-2 flex flex-col gap-1.5">
							<textarea
								value={commentDraft}
								onChange={(e) => setCommentDraft(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Add a comment..."
								rows={2}
								className="w-full resize-none border-2 border-border bg-transparent px-2 py-1.5 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-muted-foreground/60"
							/>
							<div className="flex items-center justify-between">
								<PixelText variant="id" color="muted">
									Ctrl+Enter to send
								</PixelText>
								<Button
									variant="elevated"
									size="xs"
									onClick={handleSubmitComment}
									disabled={!commentDraft.trim()}
									className="font-mono text-[10px] font-semibold uppercase tracking-widest"
								>
									Comment
								</Button>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

export { KanbanTaskDetail };
