# Plan: Show Task Dependencies in UI

## Context

The backend has a working dependency system (`dependsOn` field on tasks, `canStart`/`getUnmetDependencies` in `tasks/dependencies.ts`), but the UI has zero visibility into dependencies. Users can't see what blocks a task or what a task blocks.

## Changes

### 1. New backend query: `getDependencyInfo`
**File:** `packages/backend/convex/tasks/dependencies.ts`

Add a public query that returns both directions for a given task:
- **Depends on** — resolve `task.dependsOn[]` into `{ id, title, status }[]`
- **Blocks** — scan all tasks to find any with `dependsOn` containing this task's ID → `{ id, title, status }[]`

This is a single query the modal can subscribe to. The full table scan for "blocks" is fine at our scale (< hundreds of tasks).

### 2. Wire dependency data into TaskDetailModal
**File:** `apps/web/src/lib/kanban/TaskDetailModal.smart.tsx`

- Subscribe to the new `getDependencyInfo` query
- Map results into a `dependencies` prop for the presentational component

**File:** `apps/web/src/lib/kanban/TaskDetailModal.component.tsx`

- Add `KanbanTaskDependency` type: `{ id, title, status, done }`
- Add `dependencies?: { dependsOn: KanbanTaskDependency[], blocks: KanbanTaskDependency[] }` to props
- Render a "Dependencies" section between Subtasks and Assigned To:
  - "Depends on" list with task ID + title + status badge (clickable to navigate)
  - "Blocks" list with task ID + title + status badge
  - Skip section entirely if both lists are empty

### 3. Add "blocked" indicator on kanban cards
**File:** `apps/web/src/lib/kanban/KanbanItem.component.tsx`

- Add optional `blocked?: boolean` prop to `KanbanItemProps`
- When `blocked=true`, show a small red `PixelBadge` with "Blocked" in the labels row

**File:** `apps/web/src/lib/kanban/KanbanBoard.component.tsx`

- Add `blocked?: boolean` to `KanbanBoardTask` interface
- Pass it through to `KanbanItem`

**File:** `apps/web/src/routes/_authenticated/kanban.tsx`

- In `mapKanbanToTasks`, check if task has `dependsOn` with any dep whose status !== "done" → set `blocked: true`
- The kanban data already includes all tasks grouped by status, so we can cross-reference dependency status inline without an extra query

## Files to modify
1. `packages/backend/convex/tasks/dependencies.ts` — add `getDependencyInfo` query
2. `apps/web/src/lib/kanban/TaskDetailModal.component.tsx` — add dependencies section
3. `apps/web/src/lib/kanban/TaskDetailModal.smart.tsx` — subscribe + map dependency data
4. `apps/web/src/lib/kanban/KanbanItem.component.tsx` — add `blocked` prop + badge
5. `apps/web/src/lib/kanban/KanbanBoard.component.tsx` — pass `blocked` through
6. `apps/web/src/routes/_authenticated/kanban.tsx` — compute `blocked` from kanban data

## Verification
1. `bun check-types` passes
2. Open kanban board — tasks with unmet deps show red "Blocked" badge
3. Click a task with dependencies — modal shows "Depends on" / "Blocks" sections with correct tasks and statuses
