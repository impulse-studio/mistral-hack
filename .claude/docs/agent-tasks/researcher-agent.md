# Task: Implement Researcher Agent

> **WORKTREE REQUIRED:** You MUST work in an isolated git worktree. Do NOT edit files on the main branch directly.
> **WORKTREE REQUIRED:** Run `git worktree add ../mistral-hack-researcher -b feat/researcher-agent` BEFORE making any changes.
> **WORKTREE REQUIRED:** All your work happens in the worktree. When done, the branch gets merged back. Never touch main.

## Goal
Build a researcher agent that can perform web research, analyze documents, search codebases, summarize findings, and produce structured research reports — all via shell commands + Mistral reasoning on the Daytona sandbox.

## Current State
- No `packages/backend/convex/agents/researcher/` directory exists
- Researcher role falls back to `generalAgent` in the registry (`packages/backend/convex/agents/registry.ts:9`)
- Runner dispatches to `runGeneralTask()` in `general/runner.ts` which is a **stub that just echoes the task title**
- `packages/backend/convex/agents/models.ts` — researcher maps to `magistral-medium-latest` (native reasoning)
- `packages/backend/convex/agents/shared/capabilities.ts` — researcher has `["shell", "git", "filesystem"]`

## Available Sandbox APIs
```
internal.sandbox.execute.runCommand  — run shell command, get stdout/stderr + exit code (streaming)
internal.sandbox.execute.runBackground — run daemon/long process in background
internal.sandbox.git.*               — git clone, pull, diff, etc. (if needed)
internal.logs.mutations.append       — log progress to UI
```

## Implementation Steps

### 1. Create directory structure
```
packages/backend/convex/agents/researcher/
├── agent.ts    — @convex-dev/agent definition
└── runner.ts   — research execution logic
```

### 2. Create agent definition — `packages/backend/convex/agents/researcher/agent.ts`
```typescript
import { Agent } from "@convex-dev/agent";
import { components } from "../../_generated/api";
import { mistral, REASONING_MODEL } from "../models";

export const researcherAgent = new Agent(components.agent, {
    name: "Researcher",
    languageModel: mistral(REASONING_MODEL), // magistral-medium-latest — native reasoning
    instructions: `You are a research agent with strong analytical and reasoning capabilities.
You use shell commands to search the web, read documents, analyze code, and compile findings.
You produce structured research reports with sources and key findings.
Think step by step through research problems. Be thorough and cite your sources.`,
    maxSteps: 15,
});
```

### 3. Register in registry — `packages/backend/convex/agents/registry.ts`
Replace the `generalAgent` fallback:
```typescript
import { researcherAgent } from "./researcher/agent";
// ...
researcher: researcherAgent,
```

### 4. Implement runner — `packages/backend/convex/agents/researcher/runner.ts`

**The runner implements a multi-step research loop:**

1. **Setup phase:** Install research tools on the sandbox if not present:
   - `which curl || apt-get install -y curl` (HTTP requests)
   - `which jq || apt-get install -y jq` (JSON parsing)
   - `which lynx || apt-get install -y lynx` (text-mode web browsing)
   - `which w3m || apt-get install -y w3m` (alternative text browser)

2. **Planning phase:** Send the task to Mistral (magistral-medium, native reasoning) to get a research plan:
   - Use `@ai-sdk/mistral` + `generateText` or `generateObject`
   - Input: task title + description
   - Output: structured plan with steps (e.g., "1. Search for X, 2. Read document Y, 3. Compare Z")
   - `MISTRAL_API_KEY` is available via `process.env.MISTRAL_API_KEY`

3. **Execution phase:** For each research step, execute shell commands:
   - `curl -s <url> | lynx -stdin -dump` — fetch and render web pages as text
   - `curl -sL <api_url> | jq '.'` — fetch and parse JSON APIs
   - `grep -r "pattern" /home/company/repos/` — search codebases
   - `cat /home/company/docs/*` — read local documents
   - `git log`, `git diff` — analyze git history
   - Log each command + output via `internal.logs.mutations.append`

4. **Synthesis phase:** Send all gathered information back to Mistral for synthesis:
   - Combine all research findings
   - Ask Mistral to produce a structured report
   - Save report to `/home/company/docs/research-<taskId>.md`

5. **Return** the synthesized research report as the result string

**Runner signature:**
```typescript
import type { RunnerCtx } from "../shared/types";

export async function runResearcherTask(
    ctx: RunnerCtx,
    agentId: string,
    task: { title: string; description?: string },
): Promise<string>
```

**Key implementation detail — calling Mistral from the runner:**
The runner runs inside a Convex `internalAction` (Node.js). You can call Mistral directly:
```typescript
import { createMistral } from "@ai-sdk/mistral";
import { generateText, generateObject } from "ai";
import { z } from "zod";

const mistral = createMistral(); // uses process.env.MISTRAL_API_KEY

const { text } = await generateText({
    model: mistral("magistral-medium-latest"),
    messages: [
        { role: "system", content: "You are a research planner..." },
        { role: "user", content: `Research task: ${task.title}\n${task.description}` },
    ],
});
```

### 5. Update the dispatcher — `packages/backend/convex/agents/runner.ts`
Add a new branch for researcher:
```typescript
import { runResearcherTask } from "./researcher/runner";
// ...
} else if (agent.role === "researcher") {
    result = await runResearcherTask(ctx, agentId, task);
} else {
    result = await runGeneralTask(ctx, agentId, task, agent.role);
}
```

## Testing
1. `bun check-types` passes
2. Agent definition exports correctly
3. Registry imports work
4. Dispatcher routes researcher to the new runner

## Files to Create/Modify
- **Create:** `packages/backend/convex/agents/researcher/agent.ts`
- **Create:** `packages/backend/convex/agents/researcher/runner.ts`
- **Modify:** `packages/backend/convex/agents/registry.ts` (add researcherAgent)
- **Modify:** `packages/backend/convex/agents/runner.ts` (add researcher dispatch branch)

## Constraints
- MUST use Mistral models only (`magistral-medium-latest` for reasoning)
- MUST use `@ai-sdk/mistral` from Vercel AI SDK
- MUST log all research steps via `internal.logs.mutations.append`
- MUST save reports to `/home/company/docs/`
- Runner is a plain helper (no `"use node"` — called from dispatcher)
- MUST run `bun check-types` before considering done

---

> **REMINDER — WORKTREE:** You MUST be working in `../mistral-hack-researcher` (branch `feat/researcher-agent`), NOT on main. If you haven't created the worktree yet, stop and run: `git worktree add ../mistral-hack-researcher -b feat/researcher-agent`
> **REMINDER — WORKTREE:** Do NOT commit to main. Do NOT edit files in the main working directory. All changes go in the worktree at `../mistral-hack-researcher`.
> **REMINDER — WORKTREE:** When finished, commit your work on the `feat/researcher-agent` branch inside the worktree. Do not merge — the lead will handle merging.
