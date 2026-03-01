# Task: Implement General Agent

> **WORKTREE REQUIRED:** You MUST work in an isolated git worktree. Do NOT edit files on the main branch directly.
> **WORKTREE REQUIRED:** Run `git worktree add ../mistral-hack-general -b feat/general-agent` BEFORE making any changes.
> **WORKTREE REQUIRED:** All your work happens in the worktree. When done, the branch gets merged back. Never touch main.

## Goal
Build a general-purpose agent that handles miscellaneous tasks that don't fit neatly into coder/browser/designer/researcher/copywriter. This is the catch-all: DevOps, data processing, file management, API interactions, system administration, deployment, etc. It should be able to reason about arbitrary tasks and execute them via shell commands.

## Current State
- `packages/backend/convex/agents/general/agent.ts` — has a valid `@convex-dev/agent` definition using `magistral-medium-latest`, but with a generic prompt
- `packages/backend/convex/agents/general/runner.ts` — **17-line stub** that echoes task title and returns "not yet fully implemented"
- `packages/backend/convex/agents/registry.ts` — general is registered (pointing to `generalAgent`)
- `packages/backend/convex/agents/models.ts` — general maps to `magistral-medium-latest`
- `packages/backend/convex/agents/shared/capabilities.ts` — general has `["shell", "git", "deploy", "github", "filesystem"]` (most capabilities)

## Available Sandbox APIs
```
internal.sandbox.execute.runCommand    — run shell command (streaming)
internal.sandbox.execute.runBackground — run daemon process
internal.sandbox.git.*                 — git operations
internal.sandbox.github.*             — GitHub API operations
internal.sandbox.deploy.*             — deployment operations (Vercel, etc.)
internal.sandbox.codeExecution.listFiles — list files in a directory
internal.logs.mutations.append         — log progress to UI
```

## Implementation Steps

### 1. Improve agent definition — `packages/backend/convex/agents/general/agent.ts`
Keep the existing structure but enhance the system prompt:
```typescript
import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { mistral, REASONING_MODEL } from "../models";

export const generalAgent = new Agent(components.agent, {
    name: "Worker",
    languageModel: mistral(REASONING_MODEL),
    instructions: `You are a general-purpose worker agent with strong reasoning and broad capabilities.
You handle DevOps, data processing, file management, API calls, deployments, and other miscellaneous tasks.
You have access to: shell commands, git, GitHub, deployments (Vercel), and the full filesystem.
The shared workspace is at /home/company/ — use it for inputs and outputs.
Think step by step through complex problems. Execute commands, check results, iterate.
Save any outputs to /home/company/outputs/.`,
    maxSteps: 15,
});
```

### 2. Implement runner — `packages/backend/convex/agents/general/runner.ts`

**Replace the stub with a plan-execute loop:**

1. **Planning phase:** Send the task to Mistral to generate an execution plan:
   - Use `generateObject` with a Zod schema to get structured steps
   - Each step: `{ description: string, command: string }`
   - Cap at 10 steps

   ```typescript
   import { createMistral } from "@ai-sdk/mistral";
   import { generateObject } from "ai";
   import { z } from "zod";

   const stepSchema = z.object({
       steps: z.array(z.object({
           description: z.string(),
           command: z.string(),
       })).max(10),
   });

   const mistralClient = createMistral();
   const { object: plan } = await generateObject({
       model: mistralClient("magistral-medium-latest"),
       schema: stepSchema,
       messages: [
           { role: "system", content: "You are a task planner. Given a task, produce a sequence of shell commands to accomplish it. Each step should have a description and a shell command. The working directory is /home/user. The shared workspace is /home/company/. Save outputs to /home/company/outputs/." },
           { role: "user", content: `Task: ${task.title}\n\nDescription: ${task.description ?? "No additional details."}` },
       ],
   });
   ```

2. **Execution phase:** Run each planned command sequentially:
   - Log each step description + command
   - Execute via `internal.sandbox.execute.runCommand`
   - Collect stdout/stderr
   - If a command fails (non-zero exit), send the error + context back to Mistral to get a fix/retry command
   - Cap retries at 2 per step

3. **Result collection:** Combine all outputs into a summary:
   - List what was accomplished
   - Include key output snippets
   - Note any failures

4. **Return** the summary string

**Runner signature (preserve existing):**
```typescript
import type { RunnerCtx } from "../shared/types";

export async function runGeneralTask(
    ctx: RunnerCtx,
    agentId: string,
    task: { title: string; description?: string },
    role: string,
): Promise<string>
```

Note: Keep the `role` parameter — the general runner is also the fallback for any unrecognized roles.

### 3. No dispatcher changes needed
The dispatcher already routes unrecognized roles to `runGeneralTask`. No changes required in `runner.ts`.

### 4. No registry changes needed
`general: generalAgent` is already registered.

## Testing
1. `bun check-types` passes
2. The runner handles both happy path (all commands succeed) and error path (command fails → retry)
3. Results include meaningful output, not just "executed N commands"

## Files to Modify
- **Modify:** `packages/backend/convex/agents/general/agent.ts` (improve system prompt)
- **Modify:** `packages/backend/convex/agents/general/runner.ts` (replace stub with real implementation)

## Constraints
- MUST use Mistral models only (`magistral-medium-latest`)
- MUST use `@ai-sdk/mistral` from Vercel AI SDK
- MUST log every step via `internal.logs.mutations.append`
- MUST keep the `role` parameter in the function signature (used as fallback runner)
- Use `escapeShellArg` from `../../sandbox/shellUtils` for any commands with user-provided content
- Runner is a plain helper (no `"use node"` — called from dispatcher)
- MUST run `bun check-types` before considering done

---

> **REMINDER — WORKTREE:** You MUST be working in `../mistral-hack-general` (branch `feat/general-agent`), NOT on main. If you haven't created the worktree yet, stop and run: `git worktree add ../mistral-hack-general -b feat/general-agent`
> **REMINDER — WORKTREE:** Do NOT commit to main. Do NOT edit files in the main working directory. All changes go in the worktree at `../mistral-hack-general`.
> **REMINDER — WORKTREE:** When finished, commit your work on the `feat/general-agent` branch inside the worktree. Do not merge — the lead will handle merging.
