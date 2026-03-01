# Task: Implement Copywriter Agent

> **WORKTREE REQUIRED:** You MUST work in an isolated git worktree. Do NOT edit files on the main branch directly.
> **WORKTREE REQUIRED:** Run `git worktree add ../mistral-hack-copywriter -b feat/copywriter-agent` BEFORE making any changes.
> **WORKTREE REQUIRED:** All your work happens in the worktree. When done, the branch gets merged back. Never touch main.

## Goal
Build a copywriter agent that generates, edits, and refines written content — blog posts, documentation, marketing copy, emails, README files, etc. Uses Mistral's reasoning model to produce high-quality text and shell commands to read context files and write output.

## Current State
- No `packages/backend/convex/agents/copywriter/` directory exists
- Copywriter role falls back to `generalAgent` in the registry (`packages/backend/convex/agents/registry.ts:10`)
- Runner dispatches to `runGeneralTask()` in `general/runner.ts` — **stub that echoes task title**
- `packages/backend/convex/agents/models.ts` — copywriter maps to `magistral-medium-latest`
- `packages/backend/convex/agents/shared/capabilities.ts` — copywriter has `["shell", "filesystem"]`

## Available Sandbox APIs
```
internal.sandbox.execute.runCommand  — run shell command (streaming)
internal.logs.mutations.append       — log progress to UI
```

## Implementation Steps

### 1. Create directory structure
```
packages/backend/convex/agents/copywriter/
├── agent.ts    — @convex-dev/agent definition
└── runner.ts   — content generation logic
```

### 2. Create agent definition — `packages/backend/convex/agents/copywriter/agent.ts`
```typescript
import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { mistral, REASONING_MODEL } from "../models";

export const copywriterAgent = new Agent(components.agent, {
    name: "Copywriter",
    languageModel: mistral(REASONING_MODEL), // magistral-medium-latest — native reasoning
    instructions: `You are a professional copywriter agent.
You write, edit, and refine written content: blog posts, documentation, marketing copy, emails, READMEs, specs.
You read existing files for context, generate content, and save it to the shared workspace.
Be clear, concise, and adapt your tone to the task requirements.
Always save your output as a file to /home/company/outputs/.`,
    maxSteps: 10,
});
```

### 3. Register in registry — `packages/backend/convex/agents/registry.ts`
```typescript
import { copywriterAgent } from "./copywriter/agent";
// ...
copywriter: copywriterAgent,
```

### 4. Implement runner — `packages/backend/convex/agents/copywriter/runner.ts`

**The runner implements a write-review-refine workflow:**

1. **Context gathering:** Read any referenced files from the sandbox:
   - If task description mentions file paths, use `runCommand` to `cat` them
   - If task mentions a repo, list relevant files with `find` or `ls`
   - Collect context into a string (cap at ~10k chars to stay within model context)

2. **Content generation:** Call Mistral to generate the first draft:
   ```typescript
   import { createMistral } from "@ai-sdk/mistral";
   import { generateText } from "ai";

   const mistral = createMistral();
   const { text } = await generateText({
       model: mistral("magistral-medium-latest"),
       messages: [
           { role: "system", content: "You are a professional copywriter. Write the requested content based on the task and context provided. Output ONLY the content, no meta-commentary." },
           { role: "user", content: `Task: ${task.title}\n\nDescription: ${task.description}\n\nContext:\n${contextText}` },
       ],
   });
   ```

3. **Self-review:** Send the draft back to Mistral for review and refinement:
   ```typescript
   const { text: refined } = await generateText({
       model: mistral("magistral-medium-latest"),
       messages: [
           { role: "system", content: "You are an editor. Review this draft and improve it: fix grammar, improve flow, tighten prose, ensure it meets the task requirements. Output ONLY the improved version." },
           { role: "user", content: `Task: ${task.title}\n\nDraft:\n${text}` },
       ],
   });
   ```

4. **Save output:** Write the final content to the sandbox:
   - Determine filename from task title (sanitize: lowercase, replace spaces with hyphens, `.md` extension)
   - Write to `/home/company/outputs/<filename>.md` using `runCommand` with heredoc or `echo`
   - Log the file path

5. **Return** the content + file path as the result

**Runner signature:**
```typescript
import type { RunnerCtx } from "../shared/types";

export async function runCopywriterTask(
    ctx: RunnerCtx,
    agentId: string,
    task: { title: string; description?: string },
): Promise<string>
```

### 5. Update the dispatcher — `packages/backend/convex/agents/runner.ts`
Add copywriter branch:
```typescript
import { runCopywriterTask } from "./copywriter/runner";
// ...
} else if (agent.role === "copywriter") {
    result = await runCopywriterTask(ctx, agentId, task);
} else {
    result = await runGeneralTask(ctx, agentId, task, agent.role);
}
```

## Testing
1. `bun check-types` passes
2. Agent definition exports correctly
3. Registry imports work
4. Dispatcher routes copywriter to the new runner

## Files to Create/Modify
- **Create:** `packages/backend/convex/agents/copywriter/agent.ts`
- **Create:** `packages/backend/convex/agents/copywriter/runner.ts`
- **Modify:** `packages/backend/convex/agents/registry.ts` (add copywriterAgent)
- **Modify:** `packages/backend/convex/agents/runner.ts` (add copywriter dispatch branch)

## Constraints
- MUST use Mistral models only (`magistral-medium-latest`)
- MUST use `@ai-sdk/mistral` from Vercel AI SDK
- MUST log progress via `internal.logs.mutations.append`
- MUST save output files to `/home/company/outputs/`
- Runner is a plain helper (no `"use node"` — called from dispatcher)
- Use `escapeShellArg` from `../../sandbox/shellUtils` for any shell commands with user content
- MUST run `bun check-types` before considering done

---

> **REMINDER — WORKTREE:** You MUST be working in `../mistral-hack-copywriter` (branch `feat/copywriter-agent`), NOT on main. If you haven't created the worktree yet, stop and run: `git worktree add ../mistral-hack-copywriter -b feat/copywriter-agent`
> **REMINDER — WORKTREE:** Do NOT commit to main. Do NOT edit files in the main working directory. All changes go in the worktree at `../mistral-hack-copywriter`.
> **REMINDER — WORKTREE:** When finished, commit your work on the `feat/copywriter-agent` branch inside the worktree. Do not merge — the lead will handle merging.
