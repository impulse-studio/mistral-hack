import { api } from "@mistral-hack/backend/convex/_generated/api";
import type { GenericId } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { useCallback } from "react";

import type { documentHubDocumentDetailData as DocumentDetailData } from "./DocumentDetailModal.component";
import { documentHubDocumentDetailModal as DocumentDetailModal } from "./DocumentDetailModal.component";

interface DocumentDetailModalSmartProps {
	documentId: string | null;
	onClose: () => void;
}

function DocumentDetailModalSmart({ documentId, onClose }: DocumentDetailModalSmartProps) {
	const typedDocId = documentId as GenericId<"documents"> | null;

	const docData = useQuery(
		api.documents.queries.get,
		typedDocId ? { documentId: typedDocId } : "skip",
	);

	const removeMutation = useMutation(api.documents.mutations.remove);

	const handleDelete = useCallback(
		async (id: string) => {
			await removeMutation({ documentId: id as GenericId<"documents"> });
			onClose();
		},
		[removeMutation, onClose],
	);

	const mapped: DocumentDetailData | null = docData
		? {
				id: docData._id,
				title: docData.title,
				content: docData.content,
				type: docData.type,
				tags: docData.tags,
				createdBy: docData.createdBy,
				mimeType: docData.mimeType,
				sizeBytes: docData.sizeBytes,
				url: docData.url,
				updatedAt: docData.updatedAt,
				createdAt: docData.createdAt,
			}
		: null;

	return (
		<DocumentDetailModal
			open={!!documentId && !!docData}
			onClose={onClose}
			document={mapped}
			onDelete={handleDelete}
		/>
	);
}

export { DocumentDetailModalSmart as documentHubDocumentDetailModalSmart };
export type { DocumentDetailModalSmartProps as documentHubDocumentDetailModalSmartProps };
