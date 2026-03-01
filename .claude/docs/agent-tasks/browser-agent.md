# Task: Implement Browser Agent

> **WORKTREE REQUIRED:** You MUST work in an isolated git worktree. Do NOT edit files on the main branch directly.
> **WORKTREE REQUIRED:** Run `git worktree add ../mistral-hack-browser -b feat/browser-agent` BEFORE making any changes.
> **WORKTREE REQUIRED:** All your work happens in the worktree. When done, the branch gets merged back. Never touch main.

## Goal
Build a vision-driven interaction loop for the browser agent that can navigate websites, extract information, fill forms, and complete web-based tasks autonomously.

## Current State
- `packages/backend/convex/agents/browser/agent.ts` — empty placeholder comment, no `@convex-dev/agent` definition
- `packages/backend/convex/agents/browser/runner.ts` — starts Computer Use environment (Xvfb + VNC), takes a screenshot, optionally launches Firefox, returns metadata. **No actual vision loop.**
- `packages/backend/convex/agents/registry.ts` — browser is NOT registered (missing from registry)
- `packages/backend/convex/agents/models.ts` — browser maps to `mistral-large-latest` (has vision capabilities)
- `packages/backend/convex/agents/shared/capabilities.ts` — browser has `["shell", "computerUse", "filesystem"]`

## Available Sandbox APIs
All Computer Use primitives are already implemented in `packages/backend/convex/sandbox/computerUse.ts`:
```
internal.sandbox.computerUse.takeScreenshot         — full-screen screenshot (base64)
internal.sandbox.computerUse.takeCompressedScreenshot — compressed JPEG/PNG
internal.sandbox.computerUse.mouseClick              — click at (x, y)
internal.sandbox.computerUse.mouseMove               — move to (x, y)
internal.sandbox.computerUse.mouseDrag               — drag from (x1,y1) to (x2,y2)
internal.sandbox.computerUse.mouseScroll             — scroll up/down
internal.sandbox.computerUse.keyboardType            — type text
internal.sandbox.computerUse.keyboardPress           — press key + modifiers
internal.sandbox.computerUse.keyboardHotkey          — key combo (e.g. "ctrl+c")
internal.sandbox.computerUse.getDisplayInfo           — screen resolution info
internal.sandbox.computerUse.getWindows               — list open windows
internal.sandbox.lifecycle.ensureComputerUseStarted  — start Xvfb+xfce4+VNC
```

Shell execution: `internal.sandbox.execute.runCommand`, `internal.sandbox.execute.runBackground`
Logging: `internal.logs.mutations.append` with `{ agentId, type, content }`

## Implementation Steps

### 1. Create agent definition — `packages/backend/convex/agents/browser/agent.ts`
Follow the pattern from `coder/agent.ts`:
```typescript
import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { mistral, MANAGER_MODEL } from "../models";

export const browserAgent = new Agent(components.agent, {
    name: "Browser",
    languageModel: mistral(MANAGER_MODEL), // mistral-large-latest — has vision
    instructions: `You are a browser agent that navigates websites using Computer Use.
You see screenshots of the desktop and decide what to click, type, or scroll.
You complete web tasks: research, form filling, data extraction, testing.
Think step by step about what you see and what action to take next.
Always describe what you see in the screenshot before acting.`,
    maxSteps: 30, // browser tasks need more steps (screenshot→think→act loop)
});
```

### 2. Register in registry — `packages/backend/convex/agents/registry.ts`
Add `browser: browserAgent` and `designer: browserAgent` (designer shares for now):
```typescript
import { browserAgent } from "./browser/agent";
// ...
export const agentRegistry = {
    manager: managerAgent,
    coder: coderAgent,
    browser: browserAgent,
    designer: browserAgent,  // shares browser agent for now
    researcher: generalAgent,
    copywriter: generalAgent,
    general: generalAgent,
} as const;
```

### 3. Implement vision loop in runner — `packages/backend/convex/agents/browser/runner.ts`
Replace the current skeleton with a proper vision-action loop:

**Core loop logic:**
1. Start Computer Use environment (already works)
2. Launch Firefox with the target URL (if task mentions a URL)
3. Take a compressed screenshot
4. Send screenshot + task description to Mistral Large via the Vercel AI SDK (`generateText` or `generateObject`)
   - The prompt should include: the task, the current screenshot (as base64 image), and ask the model what action to take next
   - Parse the response into structured actions: `{ action: "click", x, y }`, `{ action: "type", text }`, `{ action: "scroll", direction }`, `{ action: "done", result }`, etc.
5. Execute the action via the sandbox Computer Use APIs
6. Log each step
7. Repeat from step 3 until the model says "done" or max iterations (15) reached
8. Return the accumulated result

**Important implementation details:**
- Use `@ai-sdk/mistral` directly (same as models.ts): `import { createMistral } from "@ai-sdk/mistral"` + `generateObject` with a Zod schema for structured action output
- The `MISTRAL_API_KEY` is available via `process.env.MISTRAL_API_KEY` (runner runs in `"use node"` context)
- Screenshots come back as base64 strings — pass them as image content parts in the AI SDK message
- Use `takeCompressedScreenshot` with JPEG format and quality ~60 to keep token costs down
- Add a 1-second delay between actions to let the UI settle
- Max 15 iterations to prevent infinite loops
- Log each action and screenshot to `internal.logs.mutations.append` so the UI shows progress

**Runner signature must match existing pattern:**
```typescript
export async function runComputerUseTask(
    ctx: RunnerCtx,
    agentId: string,
    task: { title: string; description?: string },
): Promise<string>
```

### 4. Do NOT change the dispatcher
The dispatcher in `packages/backend/convex/agents/runner.ts` already routes `browser` and `designer` roles to `runComputerUseTask`. No changes needed there.

## Testing
After implementation, verify:
1. `bun check-types` passes with no errors
2. The agent definition exports correctly and registry imports work
3. The runner function signature matches `RunnerCtx` type

## Files to Create/Modify
- **Modify:** `packages/backend/convex/agents/browser/agent.ts` (replace placeholder)
- **Modify:** `packages/backend/convex/agents/browser/runner.ts` (replace skeleton)
- **Modify:** `packages/backend/convex/agents/registry.ts` (add browserAgent)

## Constraints
- MUST use Mistral models only (vision via `mistral-large-latest`)
- MUST use `@ai-sdk/mistral` from Vercel AI SDK (already installed)
- MUST log all actions via `internal.logs.mutations.append`
- MUST respect the `RunnerCtx` type from `agents/shared/types.ts`
- Runner file needs `// no "use node"` — it's a plain helper called from the `"use node"` dispatcher
- Keep the `escapeShellArg` import from `../../sandbox/shellUtils` if running any shell commands

---

> **REMINDER — WORKTREE:** You MUST be working in `../mistral-hack-browser` (branch `feat/browser-agent`), NOT on main. If you haven't created the worktree yet, stop and run: `git worktree add ../mistral-hack-browser -b feat/browser-agent`
> **REMINDER — WORKTREE:** Do NOT commit to main. Do NOT edit files in the main working directory. All changes go in the worktree at `../mistral-hack-browser`.
> **REMINDER — WORKTREE:** When finished, commit your work on the `feat/browser-agent` branch inside the worktree. Do not merge — the lead will handle merging.
