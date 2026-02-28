# Plan: Daytona Integration + Sub-Agent Execution

> Owner: DEV 2 | Priority: CRITICAL PATH
> Estimated: ~4-5h total | Prereqs: B1-B6 ✅ done

This plan covers the missing Daytona SDK integration (B7-B10) and the sub-agent execution pipeline (B12-B13, B17).

---

## Step 0: Install Daytona SDK

```bash
cd packages/backend && bun add @daytonaio/sdk
```

Add `DAYTONA_API_KEY` and `DAYTONA_TARGET` to Convex environment variables (Dashboard > Settings > Environment Variables).

---

## Step 1: Daytona Sandbox Lifecycle — `convex/sandbox/lifecycle.ts`

**Task: B7** | ~1h

Create a new file `convex/sandbox/lifecycle.ts` with Convex **actions** (not mutations — actions can call external APIs).

### Functions to implement:

#### `createSandbox`
- `"use node"` directive (Daytona SDK needs Node runtime)
- Import `Daytona` from `@daytonaio/sdk`
- Instantiate client: `const daytona = new Daytona()`
- Call `daytona.create({ language: 'typescript' })` or with custom image
- Store the returned `sandbox.id` in our DB via `ctx.runMutation(internal.sandbox.mutations.ensureSandbox, { daytonaId })`
- Update status to `"running"` via `ctx.runMutation(internal.sandbox.mutations.updateStatus, { ... })`
- Return the sandbox ID

#### `startSandbox`
- Get sandbox record from DB (via `ctx.runQuery`)
- Call `daytona.start(daytonaId)` or get existing sandbox via `daytona.get(daytonaId)`
- Update status to `"running"`
- Record activity timestamp

#### `stopSandbox`
- Get sandbox record
- Call `daytona.remove(daytonaId)` or equivalent stop method
- Update status to `"stopped"`

#### `ensureRunning` (helper)
- Check DB status — if already `"running"`, return immediately
- If `"stopped"`, call `startSandbox`
- If `"creating"` or none, call `createSandbox`
- This is the main entry point other code will use

### Key patterns:
```typescript
"use node";
import { Daytona } from "@daytonaio/sdk";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

const getDaytona = () => new Daytona();

export const createSandbox = internalAction({
  args: {},
  handler: async (ctx) => {
    const daytona = getDaytona();
    const sandbox = await daytona.create();

    const sandboxId = await ctx.runMutation(
      internal.sandbox.mutations.ensureSandbox,
      { daytonaId: sandbox.id }
    );

    await ctx.runMutation(internal.sandbox.mutations.updateStatus, {
      sandboxId,
      status: "running",
    });

    return { sandboxId, daytonaId: sandbox.id };
  },
});
```

### Error handling:
- Wrap all Daytona calls in try/catch
- On error: update sandbox status to `"error"` with error message
- Log errors to console for Convex dashboard visibility

---

## Step 2: Command Execution — `convex/sandbox/execute.ts`

**Task: B8** | ~45min

#### `runCommand(sandboxId, command)`
- Get sandbox record to retrieve `daytonaId`
- Ensure sandbox is running (`ensureRunning`)
- Call `sandbox.process.executeCommand(command)` via Daytona SDK
- Record activity (extends auto-stop timer)
- Return `{ stdout, stderr, exitCode }`
- Log command + output to `agentLogs` table via `ctx.runMutation(internal.logs.mutations.append, { agentId, type: "command", content })`

### Pattern:
```typescript
export const runCommand = internalAction({
  args: {
    command: v.string(),
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, { command, agentId }) => {
    const sandboxRecord = await ctx.runQuery(internal.sandbox.queries.get);
    if (!sandboxRecord) throw new Error("No sandbox");

    const daytona = getDaytona();
    const sandbox = await daytona.get(sandboxRecord.daytonaId);

    const result = await sandbox.process.executeCommand(command);

    // Record activity to extend auto-stop
    await ctx.runMutation(internal.sandbox.mutations.recordActivity, {
      sandboxId: sandboxRecord._id,
    });

    // Log if linked to an agent
    if (agentId) {
      await ctx.runMutation(internal.logs.mutations.append, {
        agentId,
        type: "command",
        content: `$ ${command}\n${result.output}`,
      });
    }

    return result;
  },
});
```

---

## Step 3: Vibe Headless Wrapper — `convex/sandbox/vibe.ts`

**Task: B9** | ~1h

This is the key coding tool — runs Mistral Vibe (headless CLI) inside the Daytona sandbox.

#### `runVibeHeadless(agentId, prompt)`
- Ensure sandbox is running
- Construct the Vibe CLI command: `mistral-vibe --headless --prompt "${prompt}"`
- Execute via `sandbox.process.executeCommand()` or use a long-running session
- Stream output to `agentLogs` table in chunks (stdout line by line)
- Update agent status to `"working"` at start, back to `"idle"` or `"completed"` on finish
- Return the final result/output

### Streaming approach:
Since Convex actions have a 10-minute timeout and Vibe tasks can be long:
1. Use Daytona's session-based execution if available
2. Poll output periodically and stream to `agentLogs`
3. Or use the durable agent framework which survives timeouts

### Pattern:
```typescript
export const runVibeHeadless = internalAction({
  args: {
    agentId: v.id("agents"),
    prompt: v.string(),
    workingDir: v.optional(v.string()),
  },
  handler: async (ctx, { agentId, prompt, workingDir }) => {
    // Update agent status
    await ctx.runMutation(internal.office.mutations.updateAgentStatus, {
      agentId,
      status: "working",
    });

    const sandboxRecord = await ctx.runQuery(internal.sandbox.queries.get);
    const daytona = getDaytona();
    const sandbox = await daytona.get(sandboxRecord.daytonaId);

    const dir = workingDir ?? "/home/user";
    const cmd = `cd ${dir} && mistral-vibe --headless --prompt "${prompt.replace(/"/g, '\\"')}"`;

    // Log the command
    await ctx.runMutation(internal.logs.mutations.append, {
      agentId,
      type: "command",
      content: `$ ${cmd}`,
    });

    const result = await sandbox.process.executeCommand(cmd);

    // Log output
    await ctx.runMutation(internal.logs.mutations.append, {
      agentId,
      type: "stdout",
      content: result.output,
    });

    // Record activity
    await ctx.runMutation(internal.sandbox.mutations.recordActivity, {
      sandboxId: sandboxRecord._id,
    });

    return { output: result.output, exitCode: result.exitCode };
  },
});
```

---

## Step 4: Sub-Agent Runner — `convex/agents/runner.ts`

**Task: B12** | ~1h

This is the action that the workpool executes for each sub-agent.

#### `runSubAgent({ agentId, taskId, model })`
1. Get agent and task records from DB
2. Ensure sandbox is running
3. Based on agent role:
   - **coder**: Call `runVibeHeadless` with the task description
   - **researcher**: Use the `@convex-dev/agent` framework with web search tools
   - **general**: Use `@convex-dev/agent` with the appropriate model
4. Stream all output to `agentLogs`
5. On completion: update task status to `"done"` or `"failed"`
6. Return result

### Pattern:
```typescript
"use node";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

export const runSubAgent = internalAction({
  args: {
    agentId: v.id("agents"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, { agentId, taskId }) => {
    // 1. Get records
    const agent = await ctx.runQuery(internal.office.queries.getAgent, { agentId });
    const task = await ctx.runQuery(internal.tasks.queries.get, { taskId });
    if (!agent || !task) throw new Error("Agent or task not found");

    // 2. Update statuses
    await ctx.runMutation(internal.office.mutations.updateAgentStatus, {
      agentId, status: "working",
    });
    await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
      taskId, status: "in_progress",
    });

    try {
      let result: string;

      if (agent.role === "coder") {
        // Use Vibe headless in sandbox
        const vibeResult = await ctx.runAction(internal.sandbox.vibe.runVibeHeadless, {
          agentId,
          prompt: `${task.title}\n\n${task.description ?? ""}`,
        });
        result = vibeResult.output;
      } else {
        // Use agent framework for non-code tasks
        // TODO: wire up generalAgent.streamText with appropriate tools
        result = "Non-code agent execution not yet implemented";
      }

      // 3. Complete task
      await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
        taskId, status: "done",
      });
      await ctx.runMutation(internal.office.mutations.updateAgentStatus, {
        agentId, status: "completed",
      });

      return { success: true, result };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      await ctx.runMutation(internal.tasks.mutations.updateStatusInternal, {
        taskId, status: "failed",
      });
      await ctx.runMutation(internal.office.mutations.updateAgentStatus, {
        agentId, status: "failed",
      });
      await ctx.runMutation(internal.logs.mutations.append, {
        agentId, type: "stderr", content: `ERROR: ${errorMsg}`,
      });

      return { success: false, error: errorMsg };
    }
  },
});
```

---

## Step 5: onComplete Handler — `convex/agents/onComplete.ts`

**Task: B13** | ~30min

Workpool callback that fires after a sub-agent finishes.

```typescript
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const onSubAgentComplete = internalMutation({
  args: {
    agentId: v.id("agents"),
    taskId: v.id("tasks"),
    success: v.boolean(),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { agentId, taskId, success, result, error }) => {
    // Update task result
    if (success && result) {
      await ctx.db.patch(taskId, { result });
    }
    if (!success && error) {
      await ctx.db.patch(taskId, { error });
    }

    // Free the desk
    const agent = await ctx.db.get(agentId);
    if (agent?.deskId) {
      await ctx.db.patch(agent.deskId, { occupiedBy: undefined });
    }

    // TODO: notify Manager thread about completion
    // This would send a message to the Manager's durable agent thread
    // so it can decide what to do next
  },
});
```

---

## Step 6: Task Dependency Check — `convex/tasks/dependencies.ts`

**Task: B17** | ~30min

```typescript
import { query } from "../_generated/server";
import { v } from "convex/values";

export const canStart = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId);
    if (!task?.dependsOn?.length) return true;

    for (const depId of task.dependsOn) {
      const dep = await ctx.db.get(depId);
      if (!dep || dep.status !== "done") return false;
    }
    return true;
  },
});
```

---

## Step 7: Wire Spawn → Workpool

**Task: Connect B6 to B11-B12** | ~30min

Update `manager/tools.ts` `spawnAgentAction` to also:
1. Create a task (if not already created)
2. Assign the task to the agent
3. Enqueue the sub-agent runner to the workpool

```typescript
// In spawnAgentAction, after spawning the agent:
import { agentPool } from "../workpool";

// Enqueue agent work
await agentPool.enqueueAction(ctx, internal.agents.runner.runSubAgent, {
  agentId,
  taskId,
});
```

This is the critical connection that makes the whole pipeline work: Manager → spawn → workpool → runner → Daytona → result.

---

## Testing Order

1. **Sandbox lifecycle**: Create sandbox manually, verify it runs
2. **Command execution**: Run `echo "hello"` in sandbox, check output
3. **Vibe headless**: Run a simple prompt, verify output streams to agentLogs
4. **Full pipeline**: Send message to Manager → it spawns agent → agent works in sandbox → result flows back

---

## Files to Create/Modify

| File | Action | Task |
|------|--------|------|
| `convex/sandbox/lifecycle.ts` | **CREATE** | B7 |
| `convex/sandbox/execute.ts` | **CREATE** | B8 |
| `convex/sandbox/vibe.ts` | **CREATE** | B9 |
| `convex/sandbox/mutations.ts` | Modify (minor) | B10 |
| `convex/agents/runner.ts` | **CREATE** | B12 |
| `convex/agents/onComplete.ts` | **CREATE** | B13 |
| `convex/tasks/dependencies.ts` | **CREATE** | B17 |
| `convex/manager/tools.ts` | Modify (add workpool enqueue) | Wire-up |
| `convex/manager/handler.ts` | Modify (add sandbox tools) | Wire-up |
