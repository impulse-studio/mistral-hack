import { useCallback, useState } from "react";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DOC_TYPES = [
	{ value: "note" as const, label: "Note" },
	{ value: "reference" as const, label: "Reference" },
	{ value: "code_doc" as const, label: "Code Doc" },
] as const;

interface DocumentCreateDialogProps {
	open: boolean;
	onClose: () => void;
	onCreate: (data: {
		title: string;
		content: string;
		type: "note" | "reference" | "code_doc";
		tags: string[];
	}) => Promise<void>;
}

function DocumentCreateDialog({ open, onClose, onCreate }: DocumentCreateDialogProps) {
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [type, setType] = useState<"note" | "reference" | "code_doc">("note");
	const [tagsInput, setTagsInput] = useState("");
	const [saving, setSaving] = useState(false);

	const reset = useCallback(() => {
		setTitle("");
		setContent("");
		setType("note");
		setTagsInput("");
		setSaving(false);
	}, []);

	const handleClose = useCallback(() => {
		reset();
		onClose();
	}, [reset, onClose]);

	const handleSubmit = useCallback(async () => {
		if (!title.trim()) return;
		setSaving(true);
		try {
			const tags = tagsInput
				.split(",")
				.map((t) => t.trim().toLowerCase())
				.filter(Boolean);
			await onCreate({ title: title.trim(), content, type, tags });
			handleClose();
		} catch {
			setSaving(false);
		}
	}, [title, content, type, tagsInput, onCreate, handleClose]);

	return (
		<Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>New Document</DialogTitle>
					<DialogClose className="border-2 border-transparent px-1.5 py-0.5 font-mono text-xs text-muted-foreground hover:text-foreground">
						✕
					</DialogClose>
				</DialogHeader>

				<div className="space-y-3 p-4">
					<div className="space-y-1">
						<label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
							Title
						</label>
						<Input
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Document title"
						/>
					</div>

					<div className="space-y-1">
						<label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
							Type
						</label>
						<div className="flex gap-1">
							{DOC_TYPES.map((t) => (
								<button
									key={t.value}
									type="button"
									onClick={() => setType(t.value)}
									className={cn(
										"border-2 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest transition-all",
										type === t.value
											? "border-brand-accent bg-brand-accent/10 text-brand-accent"
											: "border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
									)}
								>
									{t.label}
								</button>
							))}
						</div>
					</div>

					<div className="space-y-1">
						<label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
							Content (markdown)
						</label>
						<textarea
							value={content}
							onChange={(e) => setContent(e.target.value)}
							rows={10}
							className="dark:bg-input/30 border-input focus-visible:border-ring w-full border bg-transparent px-2.5 py-1 text-xs outline-none placeholder:text-muted-foreground"
							placeholder="Write your document content here..."
						/>
					</div>

					<div className="space-y-1">
						<label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
							Tags (comma-separated)
						</label>
						<Input
							value={tagsInput}
							onChange={(e) => setTagsInput(e.target.value)}
							placeholder="research, api, frontend"
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" size="sm" onClick={handleClose} disabled={saving}>
						<span className="font-mono text-[11px] font-semibold uppercase tracking-widest">
							Cancel
						</span>
					</Button>
					<Button
						variant="accent"
						size="sm"
						onClick={handleSubmit}
						disabled={!title.trim() || saving}
					>
						<span className="font-mono text-[11px] font-semibold uppercase tracking-widest">
							{saving ? "Saving..." : "Create"}
						</span>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export { DocumentCreateDialog as documentHubDocumentCreateDialog };
export type { DocumentCreateDialogProps as documentHubDocumentCreateDialogProps };
