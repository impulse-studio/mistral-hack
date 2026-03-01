# Document Hub — Implementation Plan

## Context

Currently, agent knowledge is ephemeral — scattered across task comments, deliverables (task-bound), and the shared `/home/company` filesystem. There's no structured way for agents to persist and retrieve shared knowledge (research notes, specs, context docs) independently of tasks. The Document Hub adds a first-class shared knowledge base where agents can write and read documents, and users can browse/upload them.

## Design Decisions

- **Storage**: Hybrid — inline `content` field for text/markdown (real-time via Convex subscriptions), `storageId` for binary uploads (PDFs, images)
- **Not task-bound**: Unlike `deliverables` (which require `taskId`), documents are standalone shared knowledge
- **Agent access**: Explicit tool calls (`createDocument`, `searchDocuments`, `getDocument`) — not auto-injected into prompts
- **UI**: New `/docs` route + "Docs" nav link in Header

---

## Phase 1: Schema + Backend

### 1.1 Add `documents` table to schema

**File**: `packages/backend/convex/schema.ts`

Add validators and table definition following the existing pattern (see `deliverableFields` at line 184):

```typescript
export const documentTypeValidator = v.union(
  v.literal("note"),       // Research notes, meeting summaries
  v.literal("reference"),  // Specs, guidelines, context docs
  v.literal("code_doc"),   // API docs, code documentation
  v.literal("upload"),     // User-uploaded files
);

export const documentFields = {
  title: v.string(),
  content: v.optional(v.string()),         // Inline markdown
  storageId: v.optional(v.id("_storage")), // Binary file
  mimeType: v.optional(v.string()),
  sizeBytes: v.optional(v.number()),
  type: documentTypeValidator,
  tags: v.array(v.string()),
  createdBy: v.union(v.literal("user"), v.literal("manager"), v.literal("agent")),
  agentId: v.optional(v.id("agents")),
  taskId: v.optional(v.id("tasks")),       // Optional loose association
  updatedAt: v.number(),
  createdAt: v.number(),
};
```

Indexes: `by_type`, `by_updatedAt`, `by_agent`, plus `searchIndex` on `title` and `content` for full-text search.

### 1.2 Create `packages/backend/convex/documents/` directory

**`mutations.ts`** — Following pattern from `deliverables/mutations.ts`:
- `createInternal` (internalMutation) — agent creates doc
- `updateInternal` (internalMutation) — agent updates doc
- `create` (mutation) — user creates doc
- `update` (mutation) — user edits doc
- `remove` (mutation) — user deletes doc
- `generateUploadUrl` (mutation) — for file uploads
- `saveUpload` (mutation) — save uploaded file as document

**`queries.ts`** — Following pattern from `tasks/queries.ts`:
- `list` (query) — paginated by updatedAt, optional type filter
- `get` (query) — single document by ID, resolve storageId → URL
- `search` (query) — full-text search on title + content
- `getInternal` / `searchInternal` (internalQuery) — for agent tool actions

### 1.3 Verify

Run `bun check-types`

---

## Phase 2: Agent Tools

### 2.1 Add 3 document tools to shared tools

**File**: `packages/backend/convex/agents/shared/tools.ts`

Add alongside existing `updateTaskStatusTool`, `checkAgentProgressTool`, `commentOnTaskTool`:

- `createDocumentTool` — create a doc in the hub (title, content, type, tags)
- `searchDocumentsTool` — search by keyword, optional type filter, returns snippets
- `getDocumentTool` — retrieve full content by document ID

These use `createTool` from `@convex-dev/agent` (same pattern as line 9-24 of the file).

### 2.2 Wire tools into manager handler

**File**: `packages/backend/convex/manager/handler.ts`

Add 3 `createActionTool` entries (same pattern as `sendToUser` at line 49):
- `createDocument` → handler calls `internal.documents.mutations.createInternal`
- `searchDocuments` → handler calls `internal.documents.queries.searchInternal`
- `getDocument` → handler calls `internal.documents.queries.getInternal`

Update manager system prompt (line 11-47) to add:
```
Document Hub — shared knowledge base:
- Use searchDocuments before complex tasks to find existing context
- Use createDocument to save research findings, summaries, or reference material
- Use getDocument to read full content by ID
- Documents persist independently of tasks
```

### 2.3 Wire tools into worker agents

**Files**: `packages/backend/convex/agents/general/agent.ts`, `packages/backend/convex/agents/coder/agent.ts`

Import and add the 3 document tools to each agent's `tools` object.

### 2.4 Verify

Run `bun check-types`

---

## Phase 3: UI

### 3.1 Create `apps/web/src/lib/document-hub/` directory

Following project conventions (`.component.tsx` for features, `.smart.tsx` for data layer, plain `.tsx` for internals):

| File | Role |
|------|------|
| `DocumentHub.smart.tsx` | Data fetching (useQuery for list/search), upload handler, state |
| `DocumentHub.component.tsx` | Grid layout: search bar, type filter, tag chips, document cards |
| `DocumentCard.tsx` | Internal sub-component: single doc card with type badge, tags, snippet |
| `DocumentDetailModal.smart.tsx` | Fetch single doc, resolve storage URL |
| `DocumentDetailModal.component.tsx` | Full doc view: rendered markdown, metadata, download link |
| `DocumentUploadDialog.tsx` | File drop + title/tags input, Convex upload flow |

### 3.2 Add `/docs` route

**File**: `apps/web/src/routes/_authenticated/docs.tsx`

New route rendering `DocumentHubSmart`.

### 3.3 Add nav link

**File**: `apps/web/src/components/Header.tsx`

Add `{ to: "/docs", label: "Docs" }` to the `links` array (line 8-13).

### 3.4 Verify

Run `bun check-types` and `bun build`

---

## Key Files Modified

| File | Change |
|------|--------|
| `packages/backend/convex/schema.ts` | Add `documents` table, validators, doc object |
| `packages/backend/convex/agents/shared/tools.ts` | Add 3 document tools |
| `packages/backend/convex/manager/handler.ts` | Wire 3 tools + update system prompt |
| `packages/backend/convex/agents/general/agent.ts` | Wire document tools |
| `packages/backend/convex/agents/coder/agent.ts` | Wire document tools |
| `apps/web/src/components/Header.tsx` | Add "Docs" nav link |

## New Files

| File | Purpose |
|------|---------|
| `packages/backend/convex/documents/mutations.ts` | CRUD mutations |
| `packages/backend/convex/documents/queries.ts` | List, get, search queries |
| `apps/web/src/lib/document-hub/DocumentHub.smart.tsx` | Data layer |
| `apps/web/src/lib/document-hub/DocumentHub.component.tsx` | Main grid view |
| `apps/web/src/lib/document-hub/DocumentCard.tsx` | Card sub-component |
| `apps/web/src/lib/document-hub/DocumentDetailModal.smart.tsx` | Detail data layer |
| `apps/web/src/lib/document-hub/DocumentDetailModal.component.tsx` | Detail view |
| `apps/web/src/lib/document-hub/DocumentUploadDialog.tsx` | Upload dialog |
| `apps/web/src/routes/_authenticated/docs.tsx` | Route |

## Verification

1. `bun check-types` — after each phase
2. `bun dev` — test manually:
   - Navigate to `/docs` — see empty state
   - Create a document via the UI — appears in list
   - Upload a file — appears with download link
   - Open detail modal — markdown renders correctly
3. Test agent tools via chat:
   - Ask manager to "research X and save notes to the doc hub"
   - Verify document appears in `/docs` in real-time
   - Ask manager to "check the doc hub for context on Y"
