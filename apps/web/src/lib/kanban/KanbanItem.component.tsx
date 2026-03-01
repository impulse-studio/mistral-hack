import type { VariantProps } from "class-variance-authority";
import { useMemo } from "react";

import { cva } from "class-variance-authority";

import { PixelAvatar } from "@/lib/pixel/PixelAvatar";
import { PixelBadge } from "@/lib/pixel/PixelBadge";
import { PixelProgress } from "@/lib/pixel/PixelProgress";
import { PixelTooltip } from "@/lib/pixel/PixelTooltip";
import { cn } from "@/lib/utils";

function BlockedByTooltipContent({ names }: { names: string[] }) {
	return (
		<div className="space-y-0.5">
			<span className="font-semibold">Blocked by:</span>
			{names.map((name) => (
				<div key={name}>• {name}</div>
			))}
		</div>
	);
}

const kanbanItemVariants = cva(
	"group/kanban-item relative cursor-pointer border-2 border-border bg-card p-2.5 shadow-pixel inset-shadow-pixel hover:border-muted-foreground/40 hover:shadow-pixel-hover hover:inset-shadow-pixel-hover hover:-translate-x-px hover:-translate-y-px",
	{
		variants: {
			priority: {
				urgent: "border-l-[3px] border-l-red-500",
				high: "border-l-[3px] border-l-orange-500",
				medium: "border-l-[3px] border-l-yellow-500",
				low: "border-l-[3px] border-l-muted-foreground/40",
				none: "",
			},
		},
		defaultVariants: {
			priority: "none",
		},
	},
);

/** @deprecated Use PixelBadge instead */
const kanbanLabelVariants = cva(
	"inline-flex items-center border px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-widest",
	{
		variants: {
			color: {
				blue: "border-blue-500 bg-blue-500/10 text-blue-500",
				purple: "border-purple-500 bg-purple-500/10 text-purple-500",
				red: "border-red-500 bg-red-500/10 text-red-500",
				green: "border-green-500 bg-green-500/10 text-green-500",
				yellow: "border-yellow-500 bg-yellow-500/10 text-yellow-500",
				orange: "border-orange-500 bg-orange-500/10 text-orange-500",
				pink: "border-pink-500 bg-pink-500/10 text-pink-500",
				cyan: "border-cyan-500 bg-cyan-500/10 text-cyan-500",
				muted: "border-border bg-muted text-muted-foreground",
			},
		},
		defaultVariants: {
			color: "muted",
		},
	},
);

const priorityBarVariants = cva("w-[3px]", {
	variants: {
		level: {
			urgent: "bg-red-500",
			high: "bg-orange-500",
			medium: "bg-yellow-500",
			low: "bg-muted-foreground/40",
			none: "bg-muted",
		},
		active: {
			true: "",
			false: "!bg-muted",
		},
	},
	defaultVariants: {
		level: "none",
		active: true,
	},
});

export const KANBAN_DRAG_TYPE = "kanban-item";

export interface KanbanDragData {
	id: string;
	title: string;
	sourceStatus: string;
}

export interface KanbanItemLabel {
	text: string;
	color: NonNullable<VariantProps<typeof kanbanLabelVariants>["color"]>;
}

export interface KanbanItemProps {
	id: string;
	title: string;
	priority?: NonNullable<VariantProps<typeof kanbanItemVariants>["priority"]>;
	labels?: KanbanItemLabel[];
	subtasksDone?: number;
	subtasksTotal?: number;
	assigneeInitials?: string;
	assigneeColor?: string;
	blocked?: boolean;
	blockedByNames?: string[];
	cancelled?: boolean;
	draggable?: boolean;
	sourceStatus?: string;
	className?: string;
	onClick?: () => void;
}

function PriorityBar({
	i,
	barCount,
	priority,
	active,
}: {
	i: number;
	barCount: number;
	priority: NonNullable<KanbanItemProps["priority"]>;
	active: boolean;
}) {
	const style = useMemo(() => ({ height: `${((i + 1) / barCount) * 100}%` }), [i, barCount]);
	return <div className={cn(priorityBarVariants({ level: priority, active }))} style={style} />;
}

function PriorityBars({ priority }: { priority: NonNullable<KanbanItemProps["priority"]> }) {
	const barCount = 4;
	const activeBars =
		priority === "urgent"
			? 4
			: priority === "high"
				? 3
				: priority === "medium"
					? 2
					: priority === "low"
						? 1
						: 0;

	return (
		<div className="flex items-end gap-[1.5px] h-3">
			{Array.from({ length: barCount }, (_, i) => (
				<PriorityBar
					key={i}
					i={i}
					barCount={barCount}
					priority={priority}
					active={i < activeBars}
				/>
			))}
		</div>
	);
}

function KanbanItem({
	id,
	title,
	priority = "none",
	labels,
	subtasksDone,
	subtasksTotal,
	assigneeInitials,
	assigneeColor,
	blocked = false,
	blockedByNames,
	cancelled = false,
	draggable = false,
	sourceStatus,
	className,
	onClick,
}: KanbanItemProps) {
	const hasSubtasks =
		subtasksTotal !== undefined && subtasksTotal > 0 && subtasksDone !== undefined;
	const subtasksDoneAll = hasSubtasks && subtasksDone === subtasksTotal;

	const blockedByTooltipContent = useMemo(
		() =>
			blockedByNames && blockedByNames.length > 0 ? (
				<BlockedByTooltipContent names={blockedByNames} />
			) : null,
		[blockedByNames],
	);

	return (
		<div
			data-slot="kanban-item"
			draggable={draggable}
			onDragStart={
				draggable
					? (e) => {
							const dragData: KanbanDragData = { id, title, sourceStatus: sourceStatus ?? "" };
							e.dataTransfer.setData(KANBAN_DRAG_TYPE, JSON.stringify(dragData));
							e.dataTransfer.effectAllowed = "move";
						}
					: undefined
			}
			className={cn(kanbanItemVariants({ priority }), cancelled && "opacity-50", className)}
			onClick={onClick}
		>
			{/* Top row: ID + priority */}
			<div className="mb-1.5 flex items-center justify-between">
				<span className="font-mono text-[11px] font-medium text-muted-foreground">{id}</span>
				{cancelled ? (
					<PixelBadge color="muted" size="sm">
						Cancelled
					</PixelBadge>
				) : (
					priority !== "none" && <PriorityBars priority={priority} />
				)}
			</div>

			{/* Title */}
			<p
				className={cn(
					"mb-2 line-clamp-2 text-xs font-medium leading-relaxed text-foreground",
					cancelled && "line-through text-muted-foreground",
				)}
			>
				{title}
			</p>

			{/* Labels */}
			{(blocked || (labels && labels.length > 0)) && (
				<div className="mb-2 flex flex-wrap gap-1">
					{blocked &&
						(blockedByNames && blockedByNames.length > 0 ? (
							<PixelTooltip content={blockedByTooltipContent} side="top">
								<PixelBadge color="red" variant="solid">
									Blocked
								</PixelBadge>
							</PixelTooltip>
						) : (
							<PixelBadge color="red" variant="solid">
								Blocked
							</PixelBadge>
						))}
					{labels?.map((label) => (
						<PixelBadge key={label.text} color={label.color}>
							{label.text}
						</PixelBadge>
					))}
				</div>
			)}

			{/* Bottom row: subtasks + assignee */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					{hasSubtasks && (
						<PixelProgress
							value={subtasksDone}
							max={subtasksTotal}
							showLabel
							size="sm"
							color={subtasksDoneAll ? "green" : "muted"}
						/>
					)}
				</div>

				{assigneeInitials && (
					<PixelAvatar initials={assigneeInitials} color={assigneeColor} size="xs" />
				)}
			</div>
		</div>
	);
}

export { KanbanItem, kanbanItemVariants, kanbanLabelVariants };
