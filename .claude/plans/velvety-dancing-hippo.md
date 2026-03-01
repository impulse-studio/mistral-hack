# Plan: Manager Internal Dialog with Curated User Visibility

## Context

The manager agent currently streams ALL its output (tool calls, system notifications, `[WORKER COMPLETE]` messages, reasoning) directly to the user via `useUIMessages`. This is noisy. We want the manager to think freely with rich internal dialog, and only surface polished responses to the user.

A priority mailbox system (`agentMailbox` table) was just implemented for worker agents. We'll **reuse the same mailbox** for the manager — user messages get critical priority, background work gets normal priority.

## Architecture

```
User sends message
  → mailbox.enqueue(managerId, type:"user_message", priority:2)  [critical]
  → frontend shows "Working on your request..."

processManagerMailbox picks up highest-priority item
  → managerAgent.streamText() on internal thread (invisible to user)
  → Agent thinks, calls tools, reasons internally
  → Agent calls sendToUser("Here's what I did: ...")
  → User sees the polished response, loading state clears

Sub-agent completes
  → mailbox.enqueue(managerId, type:"notification", priority:0)  [normal]
  → frontend shows "Working on other things..."
  → Agent processes internally, spawns follow-up agents
  → Agent optionally calls sendToUser() if noteworthy
```

## Implementation

### Step 1: Extend mailbox schema for manager message types

**File:** `packages/backend/convex/schema.ts`

Add `"user_message"` to `mailboxMessageTypeValidator`:
```typescript
export const mailboxMessageTypeValidator = v.union(
  v.literal("task"),
  v.literal("directive"),
  v.literal("notification"),
  v.literal("result"),
  v.literal("user_message"),  // NEW: user chat message for manager
);
```

Add `managerStatus` to `systemConfig` (no schema change needed — it's a key-value store). We'll use keys like `"manager-status"` with values `"idle"` | `"processing_user_request"` | `"background_work"`.

Also add a `threadMessageId` field to `agentMailboxFields` so we can pass the prompt message ID for `streamText`:
```typescript
export const agentMailboxFields = {
  // ... existing fields ...
  threadMessageId: v.optional(v.string()), // NEW: for manager streamText promptMessageId
};
```

### Step 2: Create `processManagerMailbox` action

**File:** `packages/backend/convex/manager/queue.ts` — **NEW**

Similar to `mailbox/process.ts` but handles manager-specific message types:

```typescript
export const processManagerMailbox = internalAction({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const messageId = await ctx.runMutation(internal.mailbox.mutations.dequeue, { agentId });
    if (!messageId) return null; // queue empty, manager stays idle

    const message = await ctx.runQuery(internal.mailbox.queries.getInternal, { messageId });

    // Set manager status based on message type
    const status = message.type === "user_message"
      ? "processing_user_request"
      : "background_work";
    await ctx.runMutation(internal.manager.queue.setManagerStatus, { status });

    // Process: run managerAgent.streamText() on the internal thread
    const threadId = await ctx.runQuery(internal.chat.getSharedThreadIdInternal);
    await managerAgent.streamText(ctx, { threadId },
      { promptMessageId: message.threadMessageId },
      { saveStreamDeltas: true }
    );

    // Auto-surface: if agent didn't call sendToUser during this run,
    // extract last response and write to messages table
    // (implementation detail: check if a new manager message was written to messages table)

    // Mark processed + set idle
    await ctx.runMutation(internal.mailbox.mutations.markProcessed, { messageId, status: "done" });
    await ctx.runMutation(internal.manager.queue.setManagerStatus, { status: "idle" });

    // Process next if more items queued
    const remaining = await ctx.runQuery(internal.mailbox.queries.countPending, { agentId });
    if (remaining > 0) {
      await ctx.scheduler.runAfter(0, internal.manager.queue.processManagerMailbox, { agentId });
    }
    return null;
  },
});

export const setManagerStatus = internalMutation({
  // upsert systemConfig key "manager-status"
});
```

### Step 3: Add `sendToUser` tool to manager

**File:** `packages/backend/convex/manager/tools.ts`

```typescript
sendToUserAction: internalMutation({
  args: { content: v.string() },
  handler: async (ctx, { content }) => {
    await ctx.db.insert("messages", {
      content,
      role: "manager",
      channel: "web",
      createdAt: Date.now(),
    });
    return { success: true };
  },
});
```

**File:** `packages/backend/convex/manager/handler.ts`

Add tool to manager definition:
```typescript
sendToUser: createTool({
  description: "Send a polished response visible to the user. Use this for status updates, summaries, and answers. Everything else stays internal.",
  args: z.object({ content: z.string() }),
  handler: internal.manager.tools.sendToUserAction,
})
```

Update system prompt to instruct the manager:
- Think freely — internal thread is private
- Call `sendToUser` when you have something polished for the user
- After handling a user request, always `sendToUser` with a summary
- For background work (sub-agent completions), only `sendToUser` if it's noteworthy
- Don't worry about formatting tool calls or internal reasoning

### Step 4: Route user messages through mailbox

**File:** `packages/backend/convex/chat.ts`

Change `sendMessage` mutation:
```typescript
// Before:
await ctx.scheduler.runAfter(0, internal.chat.generateResponseAsync, { threadId, promptMessageId });

// After:
const managerId = await getManagerAgentId(ctx); // query agents table for type: "manager"
await ctx.runMutation(internal.mailbox.mutations.enqueue, {
  recipientId: managerId,
  type: "user_message",
  payload: prompt,
  priority: 2,  // critical — always processed next
  threadMessageId: promptMessageId,
});
// Also set manager status
await setManagerStatusMutation(ctx, "processing_user_request");
```

Keep `saveMessage` to the thread so the manager has user context.

### Step 5: Route sub-agent completions through mailbox

**File:** `packages/backend/convex/agents/onComplete.ts`

Change notification path:
```typescript
// Before:
await ctx.scheduler.runAfter(0, internal.agents.onComplete.notifyManagerMutation, {
  threadId, notification
});

// After:
const managerId = await getManagerAgentId(ctx);
// Save notification to thread (for manager context)
const { messageId } = await saveMessage(ctx, components.agent, { threadId, prompt: notification });
// Enqueue at normal priority
await ctx.runMutation(internal.mailbox.mutations.enqueue, {
  recipientId: managerId,
  type: "notification",
  payload: notification,
  priority: 0,  // normal — user messages take precedence
  threadMessageId: messageId,
});
```

### Step 6: Update frontend to read from `messages` table

**File:** `apps/web/src/lib/chat/ChatWindow.smart.tsx`

Replace `useUIMessages` (which shows raw thread content) with a query on the `messages` table:
```typescript
// Before:
const { results: chatRawMessages } = useUIMessages(api.chat.listMessages, ...)

// After:
const chatRawMessages = useQuery(api.chat.getUserVisibleMessages, { limit: 50 })
```

**File:** `packages/backend/convex/chat.ts` — add query

```typescript
export const getUserVisibleMessages = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_channel_time", q => q.eq("channel", "web"))
      .order("desc")
      .take(limit ?? 50)
      .reverse(); // oldest first for display
  },
});
```

### Step 7: Add manager status indicator to frontend

**File:** `apps/web/src/lib/chat/ChatMessageList.tsx`

Replace the current "Thinking..." indicator:
```typescript
// Before:
{isLoading && !hasStreamingMessage && (
  <PixelText>Thinking...</PixelText>
)}

// After:
const managerStatus = useQuery(api.manager.getStatus);

{managerStatus === "processing_user_request" && (
  <PixelGlow color="orange" pulse>Working on your request...</PixelGlow>
)}
{managerStatus === "background_work" && (
  <PixelGlow color="yellow" pulse>Working on other things...</PixelGlow>
)}
```

**File:** `packages/backend/convex/manager/queue.ts` — add query

```typescript
export const getStatus = query({
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", q => q.eq("key", "manager-status"))
      .unique();
    return config?.value ?? "idle";
  },
});
```

## Files Summary

| File | Change |
|------|--------|
| `packages/backend/convex/schema.ts` | Add `"user_message"` to mailbox types, add `threadMessageId` field |
| `packages/backend/convex/manager/queue.ts` | **NEW** — `processManagerMailbox`, `setManagerStatus`, `getStatus` |
| `packages/backend/convex/manager/tools.ts` | Add `sendToUserAction` mutation |
| `packages/backend/convex/manager/handler.ts` | Add `sendToUser` tool, update system prompt |
| `packages/backend/convex/chat.ts` | Route `sendMessage` through mailbox, add `getUserVisibleMessages` query |
| `packages/backend/convex/agents/onComplete.ts` | Route completions through mailbox |
| `apps/web/src/lib/chat/ChatWindow.smart.tsx` | Switch from `useUIMessages` to `messages` table query |
| `apps/web/src/lib/chat/ChatMessageList.tsx` | Replace "Thinking..." with rich manager status |

## Key Decisions

1. **Reuse `agentMailbox`** — same table, same dequeue logic, manager-specific processing. No new queue table.
2. **No streaming for user-facing messages** — messages appear complete via `sendToUser`. Loading state covers the gap. Feels more agentic.
3. **User messages get priority 2 (critical)** — always processed before background work, matching the existing mailbox priority system.
4. **Auto-surface fallback** — if agent forgets `sendToUser`, extract last response automatically. Prevents silent failures.
5. **Single agent, single thread** — no architectural split. Just a display layer change.

## Part 2: Worker Agent Communication Rules

### Context

Workers currently run fire-and-forget (execute code, complete/fail). We want:
- Workers log progress as **task comments** (visible in task detail modal)
- Workers **never contact the user directly** — only the manager can
- Workers can **ping the manager** via mailbox when they need something
- Workers can move tasks to `"waiting"` status when blocked on user input
- When user/manager responds (via comment), worker resumes

### Communication rule: `User ↔ Manager ↔ Workers`

Workers NEVER contact the user. Only the manager can. Workers talk to the manager via mailbox.

### Existing infrastructure:
- `taskComments` table + `addInternal` mutation (`tasks/comments.ts:73-87`) — for progress logging
- `"waiting"` already exists in `taskStatusValidator` (`schema.ts:28`)
- Mailbox system with priority — workers can send to manager's mailbox

### Step 8: Give workers comment + escalation capabilities

**File:** `packages/backend/convex/agents/runner.ts`

Add progress logging and escalation calls during execution:

a) **Log progress as task comments** — visible in task detail modal:
```typescript
await ctx.runMutation(internal.tasks.comments.addInternal, {
  taskId,
  content: "Scaffolding complete, installing dependencies...",
  author: "agent",
  agentId,
});
```

b) **Escalate to manager** — when blocked, ping manager + set task to waiting:
```typescript
// 1. Comment explaining what's needed
await ctx.runMutation(internal.tasks.comments.addInternal, {
  taskId,
  content: "Need API key for external service — waiting for input",
  author: "agent",
  agentId,
});

// 2. Ping manager via mailbox (default priority 0, can bump higher)
const managerId = await getManagerAgentId(ctx);
await ctx.runMutation(internal.mailbox.mutations.enqueue, {
  recipientId: managerId,
  senderId: agentId,
  type: "notification",
  payload: `[NEEDS INPUT] Agent "${agent.name}" on task "${task.title}": Need API key`,
  taskId,
  priority: 0,
});

// 3. Move task to waiting
await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
  taskId,
  status: "waiting",
});
// Agent goes idle, stays alive listening on mailbox for manager's directive
```

### Step 9: Manager-driven task resumption

When the manager receives a `[NEEDS INPUT]` notification:
1. Manager calls `sendToUser` to ask the user
2. User responds to manager (via chat)
3. Manager processes the response
4. Manager sends a directive to the worker via `sendMessageToAgent` (existing tool):
   ```
   sendMessageToAgent({ agentId, type: "directive", payload: "API key is: xxx", taskId, priority: 1 })
   ```
5. Directive arrives in worker's mailbox → `processMailbox` picks it up
6. Worker's mailbox handler moves task back to `in_progress` and resumes work

**File:** `packages/backend/convex/mailbox/process.ts`

Enhance the `"directive"` case to handle task resumption:
```typescript
case "directive": {
  // If the agent has a waiting task, resume it
  if (message.taskId) {
    const task = await ctx.runQuery(internal.tasks.queries.getInternal, { taskId: message.taskId });
    if (task?.status === "waiting") {
      await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
        taskId: message.taskId,
        status: "in_progress",
      });
    }
  }
  // Log + continue (future: pass to agent LLM for processing)
  await ctx.runMutation(internal.logs.mutations.append, {
    agentId,
    type: "status",
    content: `[DIRECTIVE] ${message.payload}`,
  });
  break;
}
```

No changes needed to `tasks/comments.ts` — user comments go to the manager (existing behavior), and the manager relays to workers via `sendMessageToAgent`.

## Files Summary (Updated)

| File | Change |
|------|--------|
| `packages/backend/convex/schema.ts` | Add `"user_message"` to mailbox types, add `threadMessageId` field |
| `packages/backend/convex/manager/queue.ts` | **NEW** — `processManagerMailbox`, `setManagerStatus`, `getStatus` |
| `packages/backend/convex/manager/tools.ts` | Add `sendToUserAction` mutation |
| `packages/backend/convex/manager/handler.ts` | Add `sendToUser` tool, update system prompt |
| `packages/backend/convex/chat.ts` | Route `sendMessage` through mailbox, add `getUserVisibleMessages` query |
| `packages/backend/convex/agents/onComplete.ts` | Route completions through mailbox |
| `packages/backend/convex/agents/runner.ts` | Add progress comments + manager escalation during execution |
| `packages/backend/convex/mailbox/process.ts` | Enhance `directive` case to resume `waiting` tasks |
| `apps/web/src/lib/chat/ChatWindow.smart.tsx` | Switch from `useUIMessages` to `messages` table query |
| `apps/web/src/lib/chat/ChatMessageList.tsx` | Replace "Thinking..." with rich manager status |

## Verification

1. Send a user message → "Working on your request..." → polished response appears in chat
2. Trigger sub-agent completion while idle → "Working on other things..." → optional update
3. Send user message while sub-agent completion is queued → user message processes first (priority 2 > 0)
4. Agent creates tasks + spawns agents → user only sees curated summary, not raw tool calls
5. Worker adds progress comments → visible in task detail modal, not in chat
6. Worker moves task to "waiting" → manager notified via mailbox → manager asks user via `sendToUser` → user responds → manager sends directive to worker → worker resumes
7. `bun check-types` passes
8. Telegram bot still works (messages table is channel-aware)
