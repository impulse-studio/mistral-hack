import { useState } from "react";

import { PixelBorderBox } from "@/lib/pixel/PixelBorderBox";
import { PixelDivider } from "@/lib/pixel/PixelDivider";
import { PixelText } from "@/lib/pixel/PixelText";
import { cn } from "@/lib/utils";

import { FileTreeNode } from "./FileTreeNode";

export interface FileTreeNodeData {
	name: string;
	type: "file" | "directory";
	children?: FileTreeNodeData[];
	language?: string;
}

export interface FileTreeProps {
	root: FileTreeNodeData;
	activeFile?: string;
	defaultExpanded?: string[];
	onSelectFile?: (path: string) => void;
	className?: string;
}

function FileTree({
	root,
	activeFile,
	defaultExpanded = [],
	onSelectFile,
	className,
}: FileTreeProps) {
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set(defaultExpanded));

	const toggleExpanded = (path: string) => {
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(path)) {
				next.delete(path);
			} else {
				next.add(path);
			}
			return next;
		});
	};

	return (
		<PixelBorderBox className={cn("flex flex-col", className)}>
			{/* Header bar */}
			<div className="px-3 py-1.5">
				<PixelText variant="label">FILES</PixelText>
			</div>

			<PixelDivider />

			{/* Tree content */}
			<div className="py-1">
				{root.children?.map((child) => (
					<FileTreeNode
						key={child.name}
						node={child}
						depth={0}
						expanded={expanded}
						onToggle={toggleExpanded}
						onSelect={onSelectFile}
						activeFile={activeFile}
						pathPrefix={child.name}
					/>
				))}
			</div>
		</PixelBorderBox>
	);
}

export { FileTree };
