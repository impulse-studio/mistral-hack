# Plan: Improve Agent Panel Log Streaming

## Context

When clicking a working agent in the pixel-art office, a side panel opens showing their activity. Currently:
- Terminal shows all log types as identical green text with text prefixes
- `screenshotUrl` is resolved by the backend but never rendered — no "computer view"
- Tasks, reasoning, and deliverables all pass empty arrays
- No way to see what the agent's screen looks like

## Changes

### 1. Color-coded terminal lines + inline screenshot thumbnails

**Modify** `apps/web/src/lib/terminal/TerminalOutput.component.tsx`
- Extend `TerminalLine` interface with optional `logType` and `screenshotUrl` fields (backward compatible)
- Add `LOG_TYPE_COLOR` map: command→cyan, stderr→red, tool_call→purple, tool_result→purple/70, status→yellow, screenshot→blue, stdout→green (default)
- Replace hardcoded `text-green-400/90` with dynamic lookup from `logType`
- After `terminalAnsiToSpans(line.text)`, conditionally render `<img>` thumbnail when `screenshotUrl` exists

**Modify** `apps/web/src/routes/_authenticated/office.tsx`
- Update `terminalLines` useMemo to pass through `logType: log.type` and `screenshotUrl: log.screenshotUrl` from the already-subscribed `agentLogs`

### 2. "Screen" tab — live agent computer view

**Modify** `apps/web/src/components/office/OfficeAgentPanel.component.tsx`
- Add `"screen"` to `OfficeAgentPanelTab` union (between terminal and reasoning)
- Add `latestScreenshotUrl?: string | null` prop
- Add `OfficeAgentPanelScreen` sub-component: shows full-width image in a `PixelBorderBox elevation="floating"` with "LIVE VIEW" indicator, or "No screenshots yet" empty state

**Modify** `apps/web/src/routes/_authenticated/office.tsx`
- Derive `latestScreenshotUrl` from existing `agentLogs` (scan backwards for last `type === "screenshot"` with a `screenshotUrl`) — no new Convex query needed
- Pass as prop to `OfficeAgentPanel`

### 3. Wire real task data

**Modify** `apps/web/src/routes/_authenticated/office.tsx`
- Add `useQuery(api.tasks.queries.listByAgent, ...)` gated on `selectedConvexAgentId`
- Transform to `OfficeAgentPanelTask[]` via useMemo (`_id` → `id`, keep `title`, `status`)
- Replace `EMPTY_TASKS` with real data

Backend query `listByAgent` already exists at `packages/backend/convex/tasks/queries.ts:38-47`.

### 4. Create deliverable queries + wire real data

**Create** `packages/backend/convex/deliverables/queries.ts`
- `listByAgent(agentId)` — uses existing `by_agent` index, resolves `storageId` → URL via `ctx.storage.getUrl()`
- `listByTask(taskId)` — uses existing `by_task` index, same URL resolution
- Follow exact pattern from `logs/queries.ts:14-24` for `resolveDeliverableUrls`

**Modify** `apps/web/src/routes/_authenticated/office.tsx`
- Add `useQuery(api.deliverables.queries.listByAgent, ...)` gated on `selectedConvexAgentId`
- Transform to `OfficeAgentPanelDeliverable[]` via useMemo
- Pass as `deliverables` prop (currently not passed at all)

### 5. Wire reasoning data from status logs

**Modify** `apps/web/src/routes/_authenticated/office.tsx`
- Derive `AgentReasoningStep[]` from `agentLogs` filtered to `type === "status"`
- Each status log → a step. Last one is `"active"`, rest are `"completed"`. Duration = interval to next status log.
- Replace `EMPTY_REASONING` with derived data

### 6. Clean up unused constants

- Remove `EMPTY_TASKS`, `EMPTY_TERMINAL`, `EMPTY_REASONING` if no longer referenced (they may still be useful as fallbacks for the `?? []` pattern)

## Files

| File | Action |
|------|--------|
| `apps/web/src/lib/terminal/TerminalOutput.component.tsx` | Modify |
| `apps/web/src/routes/_authenticated/office.tsx` | Modify |
| `apps/web/src/components/office/OfficeAgentPanel.component.tsx` | Modify |
| `packages/backend/convex/deliverables/queries.ts` | Create |

## Verification

1. `bun dev:server` — confirm Convex codegen picks up new deliverable queries
2. `bun check-types` — confirm no type errors
3. Open office UI → click a worker agent → verify:
   - Terminal tab shows color-coded lines (not all green)
   - Screenshot log entries show inline thumbnails
   - Screen tab shows latest screenshot or empty state
   - Tasks tab shows real assigned tasks (or empty state if none)
   - Reasoning tab shows status-derived steps
   - Files tab appears when deliverables exist
