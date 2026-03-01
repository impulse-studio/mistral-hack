# Task: Implement Designer Agent

> **WORKTREE REQUIRED:** You MUST work in an isolated git worktree. Do NOT edit files on the main branch directly.
> **WORKTREE REQUIRED:** Run `git worktree add ../mistral-hack-designer -b feat/designer-agent` BEFORE making any changes.
> **WORKTREE REQUIRED:** All your work happens in the worktree. When done, the branch gets merged back. Never touch main.

## Goal
Build a dedicated designer agent that uses Computer Use to create visual assets, manipulate design tools, take screenshots of UI work, and produce design deliverables. While it shares the Computer Use infrastructure with the browser agent, it needs its own agent definition with design-specific prompts and a runner that installs/launches design tools.

## Current State
- No `packages/backend/convex/agents/designer/` directory exists
- Designer role dispatches to `runComputerUseTask()` in `browser/runner.ts` (identical to browser)
- `packages/backend/convex/agents/registry.ts` — designer is NOT registered
- `packages/backend/convex/agents/models.ts` — designer maps to `mistral-large-latest`
- `packages/backend/convex/agents/shared/capabilities.ts` — designer has `["shell", "computerUse", "filesystem"]`

## Available Sandbox APIs
Same Computer Use primitives as browser — all in `packages/backend/convex/sandbox/computerUse.ts`:
```
internal.sandbox.computerUse.takeScreenshot / takeCompressedScreenshot
internal.sandbox.computerUse.mouseClick / mouseMove / mouseDrag / mouseScroll
internal.sandbox.computerUse.keyboardType / keyboardPress / keyboardHotkey
internal.sandbox.computerUse.getDisplayInfo / getWindows
internal.sandbox.computerUse.startRecording / stopRecording  — record video of work
internal.sandbox.lifecycle.ensureComputerUseStarted
```

Shell: `internal.sandbox.execute.runCommand`, `internal.sandbox.execute.runBackground`
Logging: `internal.logs.mutations.append`

## Implementation Steps

### 1. Create directory structure
```
packages/backend/convex/agents/designer/
├── agent.ts    — @convex-dev/agent definition
└── runner.ts   — design-specific execution logic
```

### 2. Create agent definition — `packages/backend/convex/agents/designer/agent.ts`
```typescript
import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { mistral, MANAGER_MODEL } from "../models";

export const designerAgent = new Agent(components.agent, {
    name: "Designer",
    languageModel: mistral(MANAGER_MODEL), // mistral-large-latest — vision
    instructions: `You are a designer agent working on a virtual desktop via Computer Use.
You create visual assets, UI mockups, and design deliverables.
You can use GIMP for image editing, Inkscape for SVG/vector work, or generate HTML/CSS designs.
You see screenshots of your desktop and control mouse/keyboard to interact with tools.
Think step by step: describe what you see, decide what to do, execute one action at a time.
Save all deliverables to /home/company/outputs/ for the team to access.`,
    maxSteps: 30,
});
```

### 3. Register in registry — `packages/backend/convex/agents/registry.ts`
```typescript
import { designerAgent } from "./designer/agent";
// ...
export const agentRegistry = {
    // ...existing...
    designer: designerAgent,
} as const;
```

### 4. Implement runner — `packages/backend/convex/agents/designer/runner.ts`

**The runner should:**
1. Start Computer Use environment
2. Install design tools if not present (one-time setup per sandbox):
   - `which gimp || apt-get install -y gimp` (image editing)
   - `which inkscape || apt-get install -y inkscape` (vector/SVG)
   - These are available in Debian-based Daytona sandboxes
3. Analyze the task to determine the right approach:
   - If task involves HTML/CSS mockup → use shell to write files, then open in Firefox to screenshot
   - If task involves image editing → launch GIMP
   - If task involves SVG/vector → launch Inkscape
   - Default: generate HTML/CSS (most reliable in a sandbox)
4. Run the same vision-action loop as the browser agent:
   - Take screenshot → send to Mistral Large with task context → parse action → execute → repeat
5. Save outputs to `/home/company/outputs/`
6. Return description of what was created + file paths

**Runner signature (matches dispatcher expectations):**
```typescript
import type { RunnerCtx } from "../shared/types";

export async function runDesignerTask(
    ctx: RunnerCtx,
    agentId: string,
    task: { title: string; description?: string },
): Promise<string>
```

**Key difference from browser runner:** The designer runner should:
- Start a recording of the desktop session (for showing design process)
- Pre-install design tools via shell commands
- Default to generating HTML/CSS designs when the task is ambiguous
- Always save final screenshots of the result as deliverables

### 5. Update the dispatcher — `packages/backend/convex/agents/runner.ts`
Change the designer dispatch to use the new runner:
```typescript
import { runDesignerTask } from "./designer/runner";
// ...
} else if (agent.role === "designer") {
    result = await runDesignerTask(ctx, agentId, task);
} else if (agent.role === "browser") {
    result = await runComputerUseTask(ctx, agentId, task);
}
```

### 6. Share the vision loop with browser
If the browser agent task is done first and has a reusable vision-action loop, import and reuse it. If not, implement your own. The core loop is the same:
- Take compressed screenshot → send to Mistral with image + prompt → parse structured action → execute via Computer Use APIs → repeat

Consider extracting the shared loop to `packages/backend/convex/agents/shared/visionLoop.ts` if both agents need it:
```typescript
export async function visionActionLoop(
    ctx: RunnerCtx,
    agentId: string,
    systemPrompt: string,
    task: { title: string; description?: string },
    maxIterations?: number,
): Promise<{ result: string; screenshots: string[] }>
```

## Testing
1. `bun check-types` passes
2. Agent definition exports correctly
3. Registry imports work
4. Dispatcher routes correctly

## Files to Create/Modify
- **Create:** `packages/backend/convex/agents/designer/agent.ts`
- **Create:** `packages/backend/convex/agents/designer/runner.ts`
- **Modify:** `packages/backend/convex/agents/registry.ts` (add designerAgent)
- **Modify:** `packages/backend/convex/agents/runner.ts` (separate designer dispatch)
- **Optionally create:** `packages/backend/convex/agents/shared/visionLoop.ts` (shared vision loop)

## Constraints
- MUST use Mistral models only (`mistral-large-latest` for vision)
- MUST use `@ai-sdk/mistral` from Vercel AI SDK
- MUST log all actions via `internal.logs.mutations.append`
- MUST save outputs to `/home/company/outputs/`
- Runner is a plain helper (no `"use node"` directive — called from dispatcher)
- MUST run `bun check-types` before considering done

---

> **REMINDER — WORKTREE:** You MUST be working in `../mistral-hack-designer` (branch `feat/designer-agent`), NOT on main. If you haven't created the worktree yet, stop and run: `git worktree add ../mistral-hack-designer -b feat/designer-agent`
> **REMINDER — WORKTREE:** Do NOT commit to main. Do NOT edit files in the main working directory. All changes go in the worktree at `../mistral-hack-designer`.
> **REMINDER — WORKTREE:** When finished, commit your work on the `feat/designer-agent` branch inside the worktree. Do not merge — the lead will handle merging.
