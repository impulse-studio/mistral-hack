import type { ReactNode } from "react";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";

export interface PixelTooltipProps {
	/** The trigger element */
	children: ReactNode;
	/** Tooltip content */
	content: ReactNode;
	/** Which side of the trigger to place the tooltip */
	side?: "top" | "right" | "bottom" | "left";
	/** How long to wait before opening, in milliseconds */
	delayDuration?: number;
	className?: string;
}

function PixelTooltip({
	children,
	content,
	side = "top",
	delayDuration = 200,
	className,
}: PixelTooltipProps) {
	return (
		<TooltipPrimitive.Provider>
			<TooltipPrimitive.Root>
				<TooltipPrimitive.Trigger
					data-slot="pixel-tooltip-trigger"
					delay={delayDuration}
					render={(props) => <span {...props}>{children}</span>}
				/>
				<TooltipPrimitive.Portal>
					<TooltipPrimitive.Positioner side={side} sideOffset={6} className="isolate z-50">
						<TooltipPrimitive.Popup
							data-slot="pixel-tooltip"
							className={cn(
								"border-2 border-border bg-popover px-2 py-1 shadow-pixel inset-shadow-pixel",
								"font-mono text-[10px] text-popover-foreground",
								"data-open:animate-in data-open:fade-in-0 data-open:duration-100",
								"data-closed:animate-out data-closed:fade-out-0 data-closed:duration-100",
								className,
							)}
						>
							{content}
						</TooltipPrimitive.Popup>
					</TooltipPrimitive.Positioner>
				</TooltipPrimitive.Portal>
			</TooltipPrimitive.Root>
		</TooltipPrimitive.Provider>
	);
}

export { PixelTooltip };
