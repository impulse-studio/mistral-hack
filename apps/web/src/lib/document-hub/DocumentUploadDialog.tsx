import { useCallback, useRef, useState } from "react";

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

interface DocumentUploadDialogProps {
	open: boolean;
	onClose: () => void;
	onUpload: (file: File, title: string, tags: string[]) => Promise<void>;
}

function DocumentUploadDialog({ open, onClose, onUpload }: DocumentUploadDialogProps) {
	const [title, setTitle] = useState("");
	const [tagsInput, setTagsInput] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	const reset = useCallback(() => {
		setTitle("");
		setTagsInput("");
		setFile(null);
		setUploading(false);
	}, []);

	const handleClose = useCallback(() => {
		reset();
		onClose();
	}, [reset, onClose]);

	const handleSubmit = useCallback(async () => {
		if (!file || !title.trim()) return;
		setUploading(true);
		try {
			const tags = tagsInput
				.split(",")
				.map((t) => t.trim().toLowerCase())
				.filter(Boolean);
			await onUpload(file, title.trim(), tags);
			handleClose();
		} catch {
			setUploading(false);
		}
	}, [file, title, tagsInput, onUpload, handleClose]);

	return (
		<Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Upload File</DialogTitle>
					<DialogClose className="border-2 border-transparent px-1.5 py-0.5 font-mono text-xs text-muted-foreground hover:text-foreground">
						✕
					</DialogClose>
				</DialogHeader>

				<div className="space-y-3 p-4">
					{/* Drop zone */}
					<button
						type="button"
						onClick={() => fileRef.current?.click()}
						className={cn(
							"flex w-full flex-col items-center gap-2 border-2 border-dashed border-border p-6",
							"hover:border-brand-accent hover:text-brand-accent",
							"transition-colors",
							file && "border-brand-accent/50 bg-brand-accent/5",
						)}
					>
						<span className="font-mono text-[11px] font-semibold uppercase tracking-widest">
							{file ? file.name : "Click to select a file"}
						</span>
						{file && (
							<span className="font-mono text-[10px] text-muted-foreground">
								{(file.size / 1024).toFixed(1)} KB
							</span>
						)}
					</button>
					<input
						ref={fileRef}
						type="file"
						className="hidden"
						onChange={(e) => {
							const f = e.target.files?.[0];
							if (f) {
								setFile(f);
								if (!title) setTitle(f.name);
							}
						}}
					/>

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
					<Button variant="outline" size="sm" onClick={handleClose} disabled={uploading}>
						<span className="font-mono text-[11px] font-semibold uppercase tracking-widest">
							Cancel
						</span>
					</Button>
					<Button
						variant="accent"
						size="sm"
						onClick={handleSubmit}
						disabled={!file || !title.trim() || uploading}
					>
						<span className="font-mono text-[11px] font-semibold uppercase tracking-widest">
							{uploading ? "Uploading..." : "Upload"}
						</span>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export { DocumentUploadDialog as documentHubDocumentUploadDialog };
export type { DocumentUploadDialogProps as documentHubDocumentUploadDialogProps };
