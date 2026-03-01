# Manager `askUser` Tool — Structured User Questions

## Context

The manager agent currently has no way to ask the user structured questions with predefined options. When it needs user input, it sets a task to "waiting" status and the user must notice, open the task detail, and add a comment — unstructured and easy to miss.

This adds an **`askUser` tool** inspired by Claude Code's `AskUserQuestion`: the manager creates a structured question (with header, options, multi-select), it renders as an interactive card in the chat UI, and the user's answer flows back to wake the manager. The tool is **blocked during voice/speech mode** — the handler rejects the call with a hint to ask questions via TTS instead.

## Schema

### New table: `userQuestions`

```
packages/backend/convex/schema.ts

userQuestionFields:
  threadId: string                      // agent thread this question belongs to
  taskId?: Id<"tasks">                  // optional task context
  status: "pending" | "answered" | "expired" | "dismissed"
  questions: array of {
    question: string                    // full question text
    header: string                      // short label (max ~12 chars)
    options: array of {
      label: string                     // option display text
      description: string               // explanation of the option
    }
    multiSelect: boolean                // allow multiple selections
  }
  answers?: array of {
    selectedLabels: string[]            // which option labels were chosen
    customText?: string                 // "Other" freeform input
  }
  createdAt: number
  answeredAt?: number

Indexes:
  by_thread_status: [threadId, status]  // UI subscribes to pending per thread
```

### New systemConfig flag: `voiceSessionActive`

Frontend toggles `voiceSessionActive` in systemConfig when entering/leaving speech mode. The `askUser` tool handler checks this flag.

## Files to Create

### 1. `packages/backend/convex/userQuestions/mutations.ts`

- **`createInternal`** (internalMutation) — create question record with status "pending"
  - Called by the manager tool
- **`answer`** (mutation) — user submits answers
  - Sets `answers`, `status: "answered"`, `answeredAt`
  - Saves a user message to the agent thread summarizing the answers (so the manager sees it in context): `saveMessage(ctx, components.agent, { threadId, prompt: "[User answered: ...]" })`
  - Schedules `internal.chat.generateResponseAsync` to wake the manager with the answers
- **`dismiss`** (mutation) — user dismisses without answering
  - Sets `status: "dismissed"`
  - Optionally notifies manager

### 2. `packages/backend/convex/userQuestions/queries.ts`

- **`getPendingForThread`** (query) — returns the most recent `pending` question for a thread
  - UI subscribes to this to show/hide the question card
- **`getInternal`** (internalQuery) — fetch by ID

### 3. `apps/web/src/lib/chat/ChatQuestionCard.component.tsx`

Pixel-art styled interactive question card rendered above the chat input:
- Renders each question with header badge + options as clickable chips
- Single-select: radio-like (one at a time), multi-select: toggle chips
- Always shows an "Other" option with a text input that appears on click
- Submit button sends answers via `answer` mutation
- Dismiss button (small X) calls `dismiss` mutation
- Uses existing pixel components: `PixelBorderBox`, `PixelBadge`, `PixelText`

## Files to Modify

### 4. `packages/backend/convex/schema.ts`

Add:
- `userQuestionStatusValidator` — `"pending" | "answered" | "expired" | "dismissed"`
- `userQuestionOptionValidator` — `v.object({ label, description })`
- `userQuestionItemValidator` — `v.object({ question, header, options: v.array(option), multiSelect })`
- `userQuestionAnswerValidator` — `v.object({ selectedLabels: v.array(v.string()), customText: v.optional(v.string()) })`
- `userQuestionFields` — full field set
- `userQuestionDoc` — document validator for returns
- `userQuestions` table with `by_thread_status` index

### 5. `packages/backend/convex/manager/tools.ts`

Add **`askUserAction`** (internalAction):
1. Check `voiceSessionActive` flag in systemConfig
2. If active → return `{ error: "Cannot ask structured questions in speech mode. Ask your question via TTS instead." }`
3. Otherwise → fetch shared thread ID, call `createInternal`
4. Return `{ questionId, message: "Question sent to user. Waiting for response..." }`

### 6. `packages/backend/convex/manager/handler.ts`

Add `askUser` tool with `createActionTool`:
```
askUser: createActionTool({
  description: "Ask the user one or more structured questions with predefined options. Each question has a header, question text, options (label + description), and multiSelect flag. Users can always choose 'Other' for freeform input. NOT available in speech mode — use TTS-based questions instead.",
  args: z.object({
    questions: z.array(z.object({
      question: z.string().describe("The question to ask"),
      header: z.string().describe("Short label, max 12 chars (e.g. 'Auth method')"),
      options: z.array(z.object({
        label: z.string().describe("Option display text (1-5 words)"),
        description: z.string().describe("What this option means"),
      })).min(2).max(4),
      multiSelect: z.boolean().describe("Allow multiple selections"),
    })).min(1).max(4),
    taskId: z.string().optional().describe("Task ID for context"),
  }),
  handler: internal.manager.tools.askUserAction,
})
```

Update system prompt to mention the `askUser` tool and its speech mode restriction.

### 7. `packages/backend/convex/agent.ts`

Add `askUserTool` using `createTool` pattern (same args as above but with `inputSchema`/`execute`).
Add to `managerAgent.tools`.
Update manager instructions to mention `askUser`.

### 8. `apps/web/src/lib/chat/ChatWindow.smart.tsx`

- Subscribe to `api.userQuestions.queries.getPendingForThread` for the active thread
- Pass pending question data down to `ChatWindow` component

### 9. `apps/web/src/lib/chat/ChatWindow.component.tsx`

- Accept optional `pendingQuestion` prop
- Render `ChatQuestionCard` between the message list and the input when a question exists

### 10. `apps/web/src/lib/chat/useVoiceConverse.ts`

- When voice recording starts: set `voiceSessionActive = "true"` in systemConfig
- When voice session ends (cancel/stop/unmount): set `voiceSessionActive = "false"`
- Use a mutation to toggle the flag

### 11. `packages/backend/convex/chat.ts`

Add **`setVoiceSessionActive`** (mutation) — sets/updates the `voiceSessionActive` systemConfig key. Called by the frontend voice hook.

## Implementation Order

1. **Schema** (`schema.ts`) — add `userQuestions` table + validators
2. **Backend mutations + queries** (`userQuestions/mutations.ts`, `userQuestions/queries.ts`)
3. **Voice flag** (`chat.ts` mutation + `useVoiceConverse.ts` frontend toggle)
4. **Manager tool** (`manager/tools.ts` action + `manager/handler.ts` registration + `agent.ts` registration)
5. **Frontend** (`ChatQuestionCard.component.tsx` + wire into `ChatWindow`)
6. Type-check: `bun check-types`

## Verification

1. `bun check-types` passes
2. `bun dev` — both server and web start without errors
3. Manual test: send a message that should trigger the manager to ask a question → question card appears in chat → select options → submit → manager receives answers and proceeds
4. Voice mode test: enable voice → manager tries askUser → tool returns rejection hint
