# AI Office — Vision

## One-Liner

An open-source visual AI agent platform where a Manager agent (Telegram + web UI) orchestrates sub-agents working on a shared persistent computer. Pixel-art office. Mistral-native. Real computer use.

---

## Concept

A 2D pixel-art open office where you **see** your AI agents work. You talk to the Manager — it plans, delegates, and monitors. Sub-agents execute on a shared persistent Daytona sandbox.

The key insight: **AI work should be visible, not hidden.** Each agent sits at a desk, their terminal output streams to a pixel-art monitor, their task progress shows on a kanban board. You manage AI agents like you manage a team.

---

## Core Experience

### What the user sees

1. A dark, moody pixel-art open office — Mistral orange/red/yellow palette
2. ~8 desks arranged in the space, empty by default
3. A Manager island fixed at the bottom — always visible, always accessible
4. Sandbox status indicator: running / waking / sleeping

### What the user does

1. Types a task to the Manager (web input or Telegram message)
2. Watches the Manager think, decompose, and assign
3. Sees sub-agents spawn at desks, monitors light up with terminal output
4. Clicks any agent to see their kanban, terminal, files, reasoning
5. Receives results via the same channel they sent the task

### What happens underneath

```
User input → Manager (Mistral Large) → Task decomposition
  → Spawn sub-agents with skill + personality
  → Each sub-agent works on Daytona sandbox
  → Coding agents use Mistral Vibe headless
  → Non-code agents use Mistral Agents API (web search, code interpreter, function calling)
  → Real-time output → Convex → UI canvas + Telegram
  → Manager monitors, re-assigns on failure
  → Task complete → agents despawn → sandbox sleeps
```

---

## Agent Orchestration System

### Philosophy

Automatic orchestration inspired by OpenClaw. The Manager is not a chatbot — it's an autonomous orchestrator. It decides what to do, who does it, and when.

### Manager Agent

- **Model:** Mistral Large (best reasoning)
- **Role:** Single point of contact for the user. Plans tasks, creates sub-agents, monitors progress, handles failures, reports results.
- **Channels:** Telegram Bot + Web UI. Same brain, different surfaces.
- **Persistence:** Conversations persist via Convex. Manager remembers project context.

### Sub-Agent Design

Each sub-agent is a **custom agent** with:

| Property | Description |
|----------|-------------|
| **Skill** | What it can do (code, research, copywrite, design, DevOps) |
| **Personality** | How it communicates and approaches problems |
| **Tools** | What it has access to (Vibe headless, web search, code interpreter, function calling) |
| **Desk** | Physical location in the pixel-art office |

### Agent Lifecycle Tools

The system provides three core tools for orchestration:

- **`spawn(agent)`** — Create a new sub-agent with defined skill, personality, and tool access. Agent appears at a desk.
- **`steer(agent, message)`** — Send instructions to a running agent. Course-correct mid-task.
- **`stop(agent)`** — Terminate an agent. It despawns, desk goes empty.

### Task Management

Linear-style task management, integrated:
- Tasks have: title, description, status (backlog → todo → in_progress → review → done)
- Tasks can have dependencies (agent-2 waits for agent-1)
- Tasks are assigned to agents by the Manager
- Each agent's kanban board is visible when you click their desk

---

## Sandbox Architecture

### One persistent computer for all agents

Daytona sandbox = the company computer. All agents share the same filesystem.

```
/home/company/
├── repos/          ← Git repos (persist forever)
├── docs/           ← Research, specs, notes
├── outputs/        ← Agent deliverables
└── .mistral-vibe/  ← Vibe CLI config/cache
```

### Smart Lifecycle

```
RUNNING ──(15 min idle)──▶ STOPPED ──(configurable)──▶ ARCHIVED
  💻 Agent working          💾 FS persists              📦 Object storage
  ~$0.55/h                  ~$0.0001/h                  ~free
```

- **Wake on task:** Manager calls `sandbox.start()` before dispatching work
- **Disable auto-stop:** While agents work, sandbox stays alive
- **Re-enable on completion:** After all agents finish, auto-stop kicks in
- **Everything persists:** Agent-1 clones a repo → Agent-2 can edit it

---

## Visual Design

### Palette

- Primary: Mistral Orange `#FF7000`
- Accent: Mistral Red `#FD3F29`
- Highlight: Mistral Yellow `#FFCB00`
- Background: Dark moody tones
- Font: Press Start 2P (pixel font)

### UI Layout

```
┌──────────────────────────────────────────────┐
│                                              │
│          Pixel-Art Office (Canvas)           │
│     Desks with agents, glowing monitors,     │
│     ambient particles, status indicators     │
│                                              │
├──────────────────────────────────────────────┤
│  [👤 Manager] [status] [tasks: 3]  [🟢 sandbox] │
│  ┌────────────────────────────────────────┐  │
│  │ Give the manager a task...             │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘

Side Panel (click any agent):
┌──────────────┐
│ [Kanban]     │ ← TODO / In Progress / Done
│ [Terminal]   │ ← Live streaming from Daytona
│ [Files]      │ ← Agent's working directory
│ [Reasoning]  │ ← Why this approach
└──────────────┘
```

### Tech: HTML5 Canvas (proven in prototype). PixiJS if sprite management needed.

---

## Channel Architecture

```
Telegram message → Bot webhook → Manager agent → Convex → Web UI updates
Web UI input     → Convex      → Manager agent → Response on web + Telegram
```

Same Manager brain, multiple surfaces. When you message via Telegram, the web office shows the Manager "receiving" the message.

---

## AI Framework: Vercel AI SDK v6

All AI interactions go through the **Vercel AI SDK v6** (`ai` package). This gives us provider-agnostic model switching.

```typescript
import { createMistral } from '@ai-sdk/mistral';
const mistral = createMistral(); // uses MISTRAL_API_KEY env var

// Model mapping (switchable by changing the string):
const managerModel = mistral('mistral-large-latest');     // Best reasoning + tool use
const codeModel = mistral('codestral-2501');              // Code-focused, 256k context
const generalModel = mistral('mistral-small-latest');     // Fast, cheap, good ratio
const routingModel = mistral('ministral-8b-2410');        // Ultra fast classification
const reasoningModel = mistral('magistral-medium-2507');  // Step-by-step thinking
```

If Mistral isn't good enough for a specific task, swap the provider:
```typescript
import { openai } from '@ai-sdk/openai';
const fallbackModel = openai('gpt-4o'); // drop-in replacement
```

---

## Convex Components Architecture

### Component Stack

```
┌─────────────────────────────────────────────────────┐
│                  CONVEX BACKEND                      │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │           convex-durable-agents              │    │
│  │  • Durable AI agent execution                │    │
│  │  • Survives crashes & restarts               │    │
│  │  • Async tool loop (no timeout limits)       │    │
│  │  • AI SDK v6 streamText with persistence     │    │
│  │  • useAgentChat React hook                   │    │
│  │  • Thread management (create, resume, stop)  │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │ routes execution through       │
│  ┌──────────────────▼──────────────────────────┐    │
│  │           @convex-dev/workpool               │    │
│  │  • Parallelism control (max N agents)        │    │
│  │  • Priority queues (Manager > sub-agents)    │    │
│  │  • Retry with backoff + jitter               │    │
│  │  • onComplete callbacks for chaining         │    │
│  │  • Status tracking in DB (reactive UI)       │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │ manages work items             │
│  ┌──────────────────▼──────────────────────────┐    │
│  │           @convex-dev/agent                  │    │
│  │  • Thread & message persistence              │    │
│  │  • Conversation context (hybrid search)      │    │
│  │  • Multi-agent thread sharing                │    │
│  │  • Streaming text with delta sync            │    │
│  │  • listUIMessages for chat UI                │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │         @convex-dev/better-auth              │    │
│  │  • User authentication (OAuth, email)        │    │
│  │  • Session management                        │    │
│  │  • Already configured in repo                │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────── OPTIONAL ───────────────────┐    │
│  │  @convex-dev/retrier    → Retry Daytona/API  │    │
│  │  @convex-dev/action-cache → Cache API calls  │    │
│  │  @convex-dev/rate-limiter → Per-user limits  │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### How Components Work Together

**1. User sends task → Manager Agent**
```
User message → Convex mutation (saveMessage)
  → scheduler.runAfter(0, generateResponse)
  → Manager durable agent runs with Mistral Large
  → Manager calls tools (plan, spawn, delegate)
```

**2. Manager spawns sub-agent → Workpool**
```
Manager tool call: spawn("coder", task)
  → Convex mutation: insert agent record, assign desk
  → workpool.enqueueAction(runSubAgent, { agentId, taskId })
  → Workpool respects max parallelism (5 concurrent agents)
```

**3. Sub-agent works → Daytona Sandbox**
```
Sub-agent action runs:
  → Daytona SDK: sandbox.process.createSession(agentId)
  → Daytona SDK: sandbox.process.executeSessionCommand(vibeCommand)
  → Stream logs → Convex mutations → agentLogs table
  → UI subscribes to agentLogs → real-time terminal display
```

**4. Sub-agent finishes → onComplete → Manager**
```
Workpool onComplete callback fires:
  → Update task status (done/failed)
  → Update agent status (completed/failed)
  → Notify Manager agent (add message to thread)
  → Manager decides: spawn next agent, report to user, or retry
```

### convex.config.ts

```typescript
import agent from "@convex-dev/agent/convex.config";
import betterAuth from "@convex-dev/better-auth/convex.config";
import durableAgents from "convex-durable-agents/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(betterAuth);
app.use(agent);
app.use(durableAgents);
app.use(workpool, { name: "agentWorkpool" });

export default app;
```

### Key Patterns

**Durable Agent Definition (Manager):**
```typescript
import { createMistral } from '@ai-sdk/mistral';
import { streamHandlerAction, defineAgentApi } from 'convex-durable-agents';

const mistral = createMistral();

export const managerHandler = streamHandlerAction(components.durableAgents, {
  model: mistral('mistral-large-latest'),
  system: `You are the Manager of an AI development office...`,
  tools: {
    spawnAgent: createActionTool({ ... }),
    createSandbox: createActionTool({ ... }),
    runVibeHeadless: createActionTool({ ... }),
    assignTask: createActionTool({ ... }),
  },
  saveStreamDeltas: true,
});

export const {
  createThread, sendMessage, getThread, listMessages,
  streamUpdates, stopThread, resumeThread,
} = defineAgentApi(components.durableAgents, internal.manager.managerHandler);
```

**Workpool for Sub-Agents:**
```typescript
import { Workpool } from '@convex-dev/workpool';

const agentPool = new Workpool(components.agentWorkpool, {
  maxParallelism: 5,
  retryActionsByDefault: true,
  defaultRetryBehavior: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 },
});

// Spawn a sub-agent via workpool
await agentPool.enqueueAction(ctx, internal.agents.runSubAgent, {
  agentId, taskId, model: 'codestral-2501',
}, {
  onComplete: internal.agents.onSubAgentComplete,
  context: { agentId, taskId },
});
```

**React Hook (Chat UI):**
```typescript
import { useAgentChat } from 'convex-durable-agents/react';

function ManagerChat({ threadId }) {
  const { messages, status, isRunning, sendMessage, stop } = useAgentChat({
    listMessages: api.manager.listMessages,
    streamUpdates: api.manager.streamUpdates,
    getThread: api.manager.getThread,
    sendMessage: api.manager.sendMessage,
    stopThread: api.manager.stopThread,
    resumeThread: api.manager.resumeThread,
    threadId,
  });
  // ... render chat UI
}
```

### Dependencies to Install

```bash
# AI SDK
bun add @ai-sdk/mistral ai

# Convex components
bun add convex-durable-agents @convex-dev/workpool

# Sandbox
bun add @daytonaio/sdk

# Telegram (Phase 5)
bun add grammy

# Voice (Phase 6)
bun add @elevenlabs/client
```

---

## Build Priority

1. Pixel-art office + Manager island (visual foundation)
2. Real-time backend — Convex schema, subscriptions, state
3. Telegram bot — Manager accessible via Telegram
4. Mistral Manager agent — receives tasks, plans, delegates
5. Daytona sandbox — persistent shared computer with lifecycle
6. Mistral Vibe headless in sandbox — coding sub-agents
7. Sub-agent spawn + terminal streaming — live output on monitors
8. Kanban side panel — click agent → see tasks/terminal/files
9. Task dependencies — agents wait for each other
10. Polish — animations, sound, voice (ElevenLabs), sandbox status UI

---

## Target Prizes

- **1st Place / Global Winner** — novel concept, real utility, impressive demo
- **Best Agent Skills** — multi-agent orchestration + Vibe headless + real computer use
- **Best Vibe** — pixel-art Mistral aesthetic (literally using Mistral Vibe)
- **Supercell Video Game** — looks and feels like a game
- **ElevenLabs** — Manager speaks results via voice

---

## Hard Requirements

1. Mistral for all agent intelligence
2. Mistral Vibe headless as default coding tool for sub-agents
3. Visual pixel-art office (agents visible at desks)
4. Real computer use on persistent shared sandbox (Daytona)
5. Smart sandbox lifecycle (sleep/wake/persist)
6. Real-time updates (agents work → UI reflects instantly)
7. Telegram integration for the Manager
8. Kanban per agent (click to see task queue, terminal, files)
9. Long-running support (agents can work for hours)
10. Automatic orchestration (spawn, steer, stop)
