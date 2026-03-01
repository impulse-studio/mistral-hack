import { api } from "@mistral-hack/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";

import type { DocumentHubDocument } from "./DocumentHub.component";
import { DocumentHub } from "./DocumentHub.component";
import { documentHubDocumentDetailModalSmart as DocumentDetailModalSmart } from "./DocumentDetailModal.smart";
import { documentHubDocumentCreateDialog as DocumentCreateDialog } from "./DocumentCreateDialog";
import { documentHubDocumentUploadDialog as DocumentUploadDialog } from "./DocumentUploadDialog";

function DocumentHubSmart() {
	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
	const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
	const [createOpen, setCreateOpen] = useState(false);
	const [uploadOpen, setUploadOpen] = useState(false);

	// Fetch documents — use search query when non-empty, otherwise list
	const listData = useQuery(
		api.documents.queries.list,
		!searchQuery
			? { type: typeFilter as "note" | "reference" | "code_doc" | "upload" | undefined }
			: "skip",
	);
	const searchData = useQuery(
		api.documents.queries.search,
		searchQuery
			? {
					query: searchQuery,
					type: typeFilter as "note" | "reference" | "code_doc" | "upload" | undefined,
				}
			: "skip",
	);

	const documents = useMemo((): DocumentHubDocument[] => {
		const raw = searchQuery ? searchData : listData;
		if (!raw) return [];
		return raw.map((d) => ({
			id: d._id,
			title: d.title,
			type: d.type,
			tags: d.tags,
			content: d.content,
			createdBy: d.createdBy,
			updatedAt: d.updatedAt,
		}));
	}, [searchQuery, searchData, listData]);

	const isLoading = searchQuery ? searchData === undefined : listData === undefined;

	// Mutations
	const createMutation = useMutation(api.documents.mutations.create);
	const generateUploadUrl = useMutation(api.documents.mutations.generateUploadUrl);
	const saveUpload = useMutation(api.documents.mutations.saveUpload);

	const handleCreate = useCallback(
		async (data: {
			title: string;
			content: string;
			type: "note" | "reference" | "code_doc";
			tags: string[];
		}) => {
			await createMutation(data);
		},
		[createMutation],
	);

	const handleUpload = useCallback(
		async (file: File, title: string, tags: string[]) => {
			const uploadUrl = await generateUploadUrl();
			const result = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": file.type },
				body: file,
			});
			const { storageId } = await result.json();
			await saveUpload({
				storageId,
				title,
				mimeType: file.type,
				sizeBytes: file.size,
				tags,
			});
		},
		[generateUploadUrl, saveUpload],
	);

	return (
		<>
			<DocumentHub
				documents={documents}
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				typeFilter={typeFilter}
				onTypeFilterChange={setTypeFilter}
				onDocumentClick={setSelectedDocId}
				onCreateClick={() => setCreateOpen(true)}
				onUploadClick={() => setUploadOpen(true)}
				isLoading={isLoading}
			/>
			<DocumentDetailModalSmart documentId={selectedDocId} onClose={() => setSelectedDocId(null)} />
			<DocumentCreateDialog
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				onCreate={handleCreate}
			/>
			<DocumentUploadDialog
				open={uploadOpen}
				onClose={() => setUploadOpen(false)}
				onUpload={handleUpload}
			/>
		</>
	);
}

export { DocumentHubSmart };
