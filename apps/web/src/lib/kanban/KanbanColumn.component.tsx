import type { DragEvent } from "react";

import { useCallback, useMemo, useRef, useState } from "react";

import { PixelBadge } from "@/lib/pixel/PixelBadge";
import { PixelBorderBox } from "@/lib/pixel/PixelBorderBox";
import { PixelDivider } from "@/lib/pixel/PixelDivider";
import { PixelText } from "@/lib/pixel/PixelText";
import { cn } from "@/lib/utils";

import { KanbanEmptyState } from "./EmptyState.component";
import { KanbanItem, KANBAN_DRAG_TYPE } from "./KanbanItem.component";
import type { KanbanDragData, KanbanItemProps } from "./KanbanItem.component";

export interface KanbanColumnProps {
	title: string;
	status: string;
	items: KanbanItemProps[];
	accentColor?: string;
	readOnly?: boolean;
	/** When true, items are draggable even in readOnly mode (for external drop targets). */
	allowDragOut?: boolean;
	onAddItem?: () => void;
	onItemClick?: (id: string) => void;
	/** Called when a task is dropped onto this column. */
	onTaskDrop?: (data: KanbanDragData, targetStatus: string) => void;
	className?: string;
}

function KanbanColumn({
	title,
	status,
	items,
	accentColor,
	readOnly = false,
	allowDragOut = false,
	onAddItem,
	onItemClick,
	onTaskDrop,
	className,
}: KanbanColumnProps) {
	const [isDragOver, setIsDragOver] = useState(false);
	const dragCounter = useRef(0);

	const accentStyle = useMemo(
		() => (accentColor ? { borderTopColor: `var(--color-${accentColor})` } : undefined),
		[accentColor],
	);

	const handleDragOver = useCallback(
		(e: DragEvent<HTMLDivElement>) => {
			if (readOnly) return;
			if (!e.dataTransfer.types.includes(KANBAN_DRAG_TYPE)) return;
			e.preventDefault();
			e.dataTransfer.dropEffect = "move";
		},
		[readOnly],
	);

	const handleDragEnter = useCallback(
		(e: DragEvent<HTMLDivElement>) => {
			if (readOnly) return;
			if (!e.dataTransfer.types.includes(KANBAN_DRAG_TYPE)) return;
			e.preventDefault();
			dragCounter.current += 1;
			setIsDragOver(true);
		},
		[readOnly],
	);

	const handleDragLeave = useCallback(
		(e: DragEvent<HTMLDivElement>) => {
			if (readOnly) return;
			e.preventDefault();
			dragCounter.current -= 1;
			if (dragCounter.current <= 0) {
				dragCounter.current = 0;
				setIsDragOver(false);
			}
		},
		[readOnly],
	);

	const handleDrop = useCallback(
		(e: DragEvent<HTMLDivElement>) => {
			if (readOnly) return;
			e.preventDefault();
			dragCounter.current = 0;
			setIsDragOver(false);

			const raw = e.dataTransfer.getData(KANBAN_DRAG_TYPE);
			if (!raw) return;

			try {
				const data = JSON.parse(raw) as KanbanDragData;
				if (data.sourceStatus === status) return;
				onTaskDrop?.(data, status);
			} catch {
				// invalid drag data — ignore
			}
		},
		[readOnly, status, onTaskDrop],
	);

	return (
		<div
			data-slot="kanban-column"
			data-status={status}
			data-drag-over={isDragOver || undefined}
			onDragOver={!readOnly ? handleDragOver : undefined}
			onDragEnter={!readOnly ? handleDragEnter : undefined}
			onDragLeave={!readOnly ? handleDragLeave : undefined}
			onDrop={!readOnly ? handleDrop : undefined}
			className={cn("min-w-[280px] max-w-[320px] flex flex-col self-stretch", className)}
		>
			{/* Top accent bar */}
			{accentColor && <div className="border-t-[3px]" style={accentStyle} />}

			<PixelBorderBox
				className={cn(
					"flex flex-col flex-1 transition-colors",
					accentColor && "border-t-0",
					isDragOver && "border-brand-accent/60 bg-brand-accent/5",
				)}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-3 py-2">
					<PixelText variant="label">{title}</PixelText>
					<PixelBadge color="muted" size="sm">
						{items.length}
					</PixelBadge>
				</div>

				<PixelDivider variant="dashed" />

				{/* Item list or empty state */}
				{items.length > 0 ? (
					<div className="flex flex-1 min-h-0 flex-col gap-2 p-2 overflow-y-auto">
						{items.map((item) => (
							<KanbanItem
								key={item.id}
								{...item}
								draggable={!readOnly || allowDragOut}
								sourceStatus={status}
								onClick={() => onItemClick?.(item.id)}
							/>
						))}
					</div>
				) : (
					<div className="flex flex-1 min-h-0 items-center justify-center p-2">
						<KanbanEmptyState
							variant="column"
							title="No tasks"
							description={
								readOnly
									? "No tasks match the current filters"
									: "Drag tasks here or create a new one"
							}
							actionLabel={readOnly ? undefined : "+ Add task"}
							onAction={readOnly ? undefined : onAddItem}
						/>
					</div>
				)}

				{/* Drop zone indicator when dragging */}
				{isDragOver && items.length > 0 && (
					<div className="mx-2 mb-2 border-2 border-dashed border-brand-accent/40 bg-brand-accent/5 px-3 py-2 text-center">
						<PixelText variant="label" color="muted">
							Drop here
						</PixelText>
					</div>
				)}
			</PixelBorderBox>
		</div>
	);
}

export { KanbanColumn };
