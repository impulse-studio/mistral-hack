import { Streamdown } from "streamdown";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { DIALOG_CLOSE_BUTTON_GHOST } from "@/components/ui/modal-close-buttons";
import { PixelAvatar } from "@/lib/pixel/PixelAvatar";
import { PixelBadge } from "@/lib/pixel/PixelBadge";
import { PixelDivider } from "@/lib/pixel/PixelDivider";
import { PixelGlow } from "@/lib/pixel/PixelGlow";
import { PixelProgress } from "@/lib/pixel/PixelProgress";
import { PixelText } from "@/lib/pixel/PixelText";
import { cn } from "@/lib/utils";

export interface KanbanTaskSubtask {
	id: string;
	title: string;
	done: boolean;
}

export interface KanbanTaskDetailModalProps {
	open: boolean;
	onClose: () => void;
	id: string;
	title: string;
	description?: string;
	priority?: "urgent" | "high" | "medium" | "low" | "none";
	labels?: Array<{
		text: string;
		color: "blue" | "purple" | "red" | "green" | "yellow" | "orange" | "pink" | "cyan" | "muted";
	}>;
	subtasks?: KanbanTaskSubtask[];
	assignee?: {
		name: string;
		initials: string;
		color?: string;
		status?: "idle" | "coding" | "thinking" | "error" | "done";
	};
	reasoning?: string;
	onOpenTerminal?: () => void;
	onOpenFiles?: () => void;
}

const kanbanPriorityColorMap = {
	urgent: "red",
	high: "orange",
	medium: "yellow",
	low: "muted",
	none: "muted",
} as const;

const kanbanAgentStatusColorMap = {
	idle: "muted",
	coding: "cyan",
	thinking: "yellow",
	error: "red",
	done: "green",
} as const;

function KanbanTaskDetailModal({
	open,
	onClose,
	id,
	title,
	description,
	priority,
	labels,
	subtasks,
	assignee,
	reasoning,
	onOpenTerminal,
	onOpenFiles,
}: KanbanTaskDetailModalProps) {
	const doneCount = subtasks?.filter((s) => s.done).length ?? 0;
	const totalCount = subtasks?.length ?? 0;

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent className="max-h-[80vh] w-full max-w-lg p-4">
				{/* Header: ID + close button */}
				<div className="mb-2 flex items-center justify-between">
					<PixelText variant="id">{id}</PixelText>
					<DialogClose render={DIALOG_CLOSE_BUTTON_GHOST}>&times;</DialogClose>
				</div>

				{/* Title */}
				<PixelText as="h2" variant="heading" className="mb-3">
					{title}
				</PixelText>

				{/* Labels row + priority badge */}
				{(labels?.length || (priority && priority !== "none")) && (
					<div className="mb-3 flex flex-wrap items-center gap-1.5">
						{priority && priority !== "none" && (
							<PixelBadge color={kanbanPriorityColorMap[priority]} variant="solid" size="sm">
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

				{/* Description section */}
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

				{/* Reasoning section */}
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

				{/* Subtasks section */}
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

				{/* Assigned to section */}
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
										color={kanbanAgentStatusColorMap[assignee.status]}
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
			</DialogContent>
		</Dialog>
	);
}

export { KanbanTaskDetailModal };
