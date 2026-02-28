import { PixelBadge, PixelBorderBox, PixelDivider, PixelText } from "@/lib/pixel";
import { cn } from "@/lib/utils";

import { KanbanEmptyState } from "./EmptyState.component";
import { KanbanItem } from "./KanbanItem.component";
import type { KanbanItemProps } from "./KanbanItem.component";

export interface KanbanColumnProps {
	title: string;
	status: string;
	items: KanbanItemProps[];
	accentColor?: string;
	readOnly?: boolean;
	onAddItem?: () => void;
	onItemClick?: (id: string) => void;
	className?: string;
}

function KanbanColumn({
	title,
	status,
	items,
	accentColor,
	readOnly = false,
	onAddItem,
	onItemClick,
	className,
}: KanbanColumnProps) {
	return (
		<div
			data-slot="kanban-column"
			data-status={status}
			className={cn("min-w-[280px] max-w-[320px] flex flex-col", className)}
		>
			{/* Top accent bar */}
			{accentColor && (
				<div className="border-t-[3px]" style={{ borderTopColor: `var(--color-${accentColor})` }} />
			)}

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
							<KanbanItem key={item.id} {...item} onClick={() => onItemClick?.(item.id)} />
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
