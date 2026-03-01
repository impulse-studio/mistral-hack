import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, { text: string; color: string }> = {
	note: { text: "Note", color: "text-blue-400 border-blue-500/40 bg-blue-500/10" },
	reference: { text: "Reference", color: "text-green-400 border-green-500/40 bg-green-500/10" },
	code_doc: { text: "Code Doc", color: "text-purple-400 border-purple-500/40 bg-purple-500/10" },
	upload: { text: "Upload", color: "text-orange-400 border-orange-500/40 bg-orange-500/10" },
};

interface DocumentDetailData {
	id: string;
	title: string;
	content?: string;
	type: string;
	tags: string[];
	createdBy: string;
	mimeType?: string;
	sizeBytes?: number;
	url?: string;
	updatedAt: number;
	createdAt: number;
}

interface DocumentDetailModalProps {
	open: boolean;
	onClose: () => void;
	document: DocumentDetailData | null;
	onDelete?: (id: string) => void;
}

function DocumentDetailModal({ open, onClose, document: doc, onDelete }: DocumentDetailModalProps) {
	if (!doc) return null;

	const typeBadge = TYPE_LABELS[doc.type] ?? {
		text: doc.type,
		color: "text-muted-foreground border-border",
	};

	return (
		<Dialog open={open} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<DialogTitle>{doc.title}</DialogTitle>
						<span
							className={cn(
								"border-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest",
								typeBadge.color,
							)}
						>
							{typeBadge.text}
						</span>
					</div>
					<DialogClose className="border-2 border-transparent px-1.5 py-0.5 font-mono text-xs text-muted-foreground hover:text-foreground">
						✕
					</DialogClose>
				</DialogHeader>

				<div className="space-y-4 p-4">
					{/* Metadata */}
					<div className="flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
						<span>By {doc.createdBy}</span>
						<span className="text-border">|</span>
						<span>Created {new Date(doc.createdAt).toLocaleDateString()}</span>
						<span className="text-border">|</span>
						<span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
						{doc.sizeBytes !== undefined && (
							<>
								<span className="text-border">|</span>
								<span>{formatBytes(doc.sizeBytes)}</span>
							</>
						)}
					</div>

					{/* Tags */}
					{doc.tags.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{doc.tags.map((tag) => (
								<span
									key={tag}
									className="border-2 border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground"
								>
									{tag}
								</span>
							))}
						</div>
					)}

					{/* Content */}
					{doc.content ? (
						<div className="border-2 border-border bg-background p-3">
							<pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
								{doc.content}
							</pre>
						</div>
					) : doc.url ? (
						<div className="border-2 border-border bg-background p-3">
							<a
								href={doc.url}
								target="_blank"
								rel="noopener noreferrer"
								className="text-xs text-brand-accent hover:underline"
							>
								Download file{doc.mimeType ? ` (${doc.mimeType})` : ""}
							</a>
						</div>
					) : (
						<div className="border-2 border-dashed border-border p-3 text-center">
							<span className="text-xs text-muted-foreground">No content</span>
						</div>
					)}

					{/* Actions */}
					{onDelete && (
						<div className="flex justify-end">
							<Button variant="destructive" size="sm" onClick={() => onDelete(doc.id)}>
								<span className="font-mono text-[11px] font-semibold uppercase tracking-widest">
									Delete
								</span>
							</Button>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export { DocumentDetailModal as documentHubDocumentDetailModal };
export type {
	DocumentDetailModalProps as documentHubDocumentDetailModalProps,
	DocumentDetailData as documentHubDocumentDetailData,
};
