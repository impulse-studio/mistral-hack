import { useMemo } from "react";

import { PixelBadge } from "@/lib/pixel/PixelBadge";
import { PixelBorderBox } from "@/lib/pixel/PixelBorderBox";
import { PixelDivider } from "@/lib/pixel/PixelDivider";
import { PixelText } from "@/lib/pixel/PixelText";
import { cn } from "@/lib/utils";

import { KanbanEmptyState } from "./EmptyState.component";
import { KanbanItem } from "./KanbanItem.component";
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
	className,
}: KanbanColumnProps) {
	const accentStyle = useMemo(
		() => (accentColor ? { borderTopColor: `var(--color-${accentColor})` } : undefined),
		[accentColor],
	);

	return (
		<div
			data-slot="kanban-column"
			data-status={status}
			className={cn("min-w-[280px] max-w-[320px] flex flex-col", className)}
		>
			{/* Top accent bar */}
			{accentColor && <div className="border-t-[3px]" style={accentStyle} />}

			<PixelBorderBox className={cn("flex flex-col flex-1", accentColor && "border-t-0")}>
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
					<div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[60vh]">
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
					<div className="p-2">
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
			</PixelBorderBox>
		</div>
	);
}

export { KanbanColumn };
