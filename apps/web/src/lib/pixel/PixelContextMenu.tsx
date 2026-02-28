import type { ReactNode } from "react";

import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";

import { cn } from "@/lib/utils";

export interface PixelContextMenuItem {
	label: string;
	icon?: ReactNode;
	shortcut?: string;
	variant?: "default" | "destructive";
	disabled?: boolean;
	onSelect: () => void;
}

export interface PixelContextMenuGroup {
	items: PixelContextMenuItem[];
}

export interface PixelContextMenuProps {
	/** The trigger area (right-click target) */
	children: ReactNode;
	/** Groups of menu items, separated by dividers */
	groups: PixelContextMenuGroup[];
	className?: string;
}

function PixelContextMenu({ children, groups, className }: PixelContextMenuProps) {
	return (
		<ContextMenuPrimitive.Root>
			<ContextMenuPrimitive.Trigger data-slot="pixel-context-menu-trigger">
				{children}
			</ContextMenuPrimitive.Trigger>
			<ContextMenuPrimitive.Portal>
				<ContextMenuPrimitive.Positioner className="isolate z-50">
					<ContextMenuPrimitive.Popup
						data-slot="pixel-context-menu"
						className={cn(
							"border-2 border-border bg-popover p-1 shadow-pixel-lg inset-shadow-pixel z-50 min-w-[180px]",
							"data-open:animate-in data-open:fade-in-0 data-open:duration-100",
							"data-closed:animate-out data-closed:fade-out-0 data-closed:duration-100",
							className,
						)}
					>
						{groups.map((group, groupIndex) => (
							<div key={groupIndex}>
								{groupIndex > 0 && (
									<ContextMenuPrimitive.Separator className="my-1 border-t-2 border-border" />
								)}
								{group.items.map((item) => (
									<ContextMenuPrimitive.Item
										key={item.label}
										disabled={item.disabled}
										onClick={item.onSelect}
										className={cn(
											"flex items-center gap-2 px-2 py-1.5 cursor-pointer font-mono text-[11px] text-popover-foreground outline-none",
											"data-highlighted:bg-accent data-highlighted:text-accent-foreground",
											item.variant === "destructive" &&
												"text-red-500 data-highlighted:bg-red-500/10 data-highlighted:text-red-500",
											item.disabled && "opacity-40 pointer-events-none",
										)}
									>
										{item.icon && <span className="flex-shrink-0">{item.icon}</span>}
										<span>{item.label}</span>
										{item.shortcut && (
											<span className="ml-auto font-mono text-[9px] text-muted-foreground">
												{item.shortcut}
											</span>
										)}
									</ContextMenuPrimitive.Item>
								))}
							</div>
						))}
					</ContextMenuPrimitive.Popup>
				</ContextMenuPrimitive.Positioner>
			</ContextMenuPrimitive.Portal>
		</ContextMenuPrimitive.Root>
	);
}

export { PixelContextMenu };
