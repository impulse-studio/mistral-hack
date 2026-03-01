import { DrawerPreview as DrawerPrimitive } from "@base-ui/react/drawer";
import * as React from "react";

import { cn } from "@/lib/utils";

function Drawer({ ...props }: DrawerPrimitive.Root.Props) {
	return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
	return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
	return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerBackdrop({ className, ...props }: DrawerPrimitive.Backdrop.Props) {
	return (
		<DrawerPrimitive.Backdrop
			data-slot="drawer-backdrop"
			className={cn(
				"fixed inset-0 z-50 bg-black/40",
				"data-open:animate-in data-open:fade-in-0",
				"data-closed:animate-out data-closed:fade-out-0",
				className,
			)}
			{...props}
		/>
	);
}

const drawerSideStyles = {
	right:
		"fixed top-0 right-0 bottom-0 z-50 w-[360px] border-l-2 border-border data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right",
	left: "fixed top-0 left-0 bottom-0 z-50 w-[360px] border-r-2 border-border data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left",
	top: "fixed top-0 left-0 right-0 z-50 h-[360px] border-b-2 border-border data-open:animate-in data-open:slide-in-from-top data-closed:animate-out data-closed:slide-out-to-top",
	bottom:
		"fixed bottom-0 left-0 right-0 z-50 h-[360px] border-t-2 border-border data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom",
} as const;

function DrawerContent({
	side = "right",
	backdrop = true,
	className,
	children,
	...props
}: DrawerPrimitive.Popup.Props & {
	side?: "left" | "right" | "top" | "bottom";
	backdrop?: boolean;
}) {
	return (
		<DrawerPrimitive.Portal>
			{backdrop && <DrawerBackdrop />}
			<DrawerPrimitive.Popup
				data-slot="drawer-content"
				data-side={side}
				className={cn(
					drawerSideStyles[side],
					"bg-background/98 backdrop-blur-sm shadow-pixel-lg",
					className,
				)}
				{...props}
			>
				{children}
			</DrawerPrimitive.Popup>
		</DrawerPrimitive.Portal>
	);
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="drawer-header"
			className={cn(
				"flex items-center justify-between border-b-2 border-border px-4 py-2",
				className,
			)}
			{...props}
		/>
	);
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
	return (
		<DrawerPrimitive.Title
			data-slot="drawer-title"
			className={cn("font-mono text-sm font-semibold uppercase tracking-widest", className)}
			{...props}
		/>
	);
}

function DrawerDescription({ className, ...props }: DrawerPrimitive.Description.Props) {
	return (
		<DrawerPrimitive.Description
			data-slot="drawer-description"
			className={cn("text-xs text-muted-foreground", className)}
			{...props}
		/>
	);
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
	return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

export {
	Drawer,
	DrawerTrigger,
	DrawerPortal,
	DrawerBackdrop,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerDescription,
	DrawerClose,
};
