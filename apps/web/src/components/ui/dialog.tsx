import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import * as React from "react";

import { cn } from "@/lib/utils";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogBackdrop({ className, ...props }: DialogPrimitive.Backdrop.Props) {
	return (
		<DialogPrimitive.Backdrop
			data-slot="dialog-backdrop"
			className={cn(
				"fixed inset-0 z-50 bg-black/60",
				"data-open:animate-in data-open:fade-in-0",
				"data-closed:animate-out data-closed:fade-out-0",
				className,
			)}
			{...props}
		/>
	);
}

function DialogContent({ className, children, ...props }: DialogPrimitive.Popup.Props) {
	return (
		<DialogPrimitive.Portal>
			<DialogBackdrop />
			<DialogPrimitive.Popup
				data-slot="dialog-content"
				className={cn(
					"fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
					"border-2 border-border bg-card shadow-pixel-lg inset-shadow-pixel",
					"w-full max-w-lg max-h-[85vh] overflow-y-auto",
					"data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
					"data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
					className,
				)}
				{...props}
			>
				{children}
			</DialogPrimitive.Popup>
		</DialogPrimitive.Portal>
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-header"
			className={cn(
				"flex items-center justify-between border-b-2 border-border px-4 py-2",
				className,
			)}
			{...props}
		/>
	);
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn("flex justify-end gap-2 border-t-2 border-border px-4 py-2", className)}
			{...props}
		/>
	);
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn("font-mono text-sm font-semibold uppercase tracking-widest", className)}
			{...props}
		/>
	);
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn("text-xs text-muted-foreground", className)}
			{...props}
		/>
	);
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

export {
	Dialog,
	DialogTrigger,
	DialogPortal,
	DialogBackdrop,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
	DialogClose,
};
