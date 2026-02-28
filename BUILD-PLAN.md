# AI Office — Build Plan

> Complete technical plan for the Mistral Hackathon project.
> Read this before coding. Follow the phases in order.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CHANNELS                                 │
│  [Telegram Bot] ──────┐        [Web UI] ──────┐                 │
│                       ▼                        ▼                 │
│              ┌──────────────────────────────────┐               │
│              │         CONVEX BACKEND            │               │
│              │                                   │               │
│              │  ┌─────────────────────────────┐ │               │
│              │  │   MANAGER AGENT (Durable)    │ │               │
│              │  │   Model: mistral-large       │ │               │
│              │  │   Tools: sandbox, spawn,     │ │               │
│              │  │          plan, delegate       │ │               │
│              │  └────────────┬────────────────┘ │               │
│              │               │                   │               │
│              │  ┌────────────▼────────────────┐ │               │
│              │  │      WORKPOOL (max N=5)      │ │               │
│              │  │   Queues sub-agent actions   │ │               │
│              │  │   Retry + onComplete         │ │               │
│              │  └────────────┬────────────────┘ │               │
│              │               │                   │               │
│              │  ┌────────────▼────────────────┐ │               │
│              │  │     SUB-AGENT ACTIONS        │ │               │
│              │  │  - runVibeHeadless           │ │               │
│              │  │  - runShellCommand           │ │               │
│              │  │  - webSearch                 │ │               │
│              │  │  - writeFile                 │ │               │
│              │  └────────────┬────────────────┘ │               │
│              │               │                   │               │
│              │  ┌────────────▼────────────────┐ │               │
│              │  │     DAYTONA SANDBOX          │ │               │
│              │  │  Shared persistent computer  │ │               │
│              │  │  Vibe CLI pre-installed      │ │               │
│              │  │  Auto-stop/wake lifecycle    │ │               │
│              │  └─────────────────────────────┘ │               │
│              │                                   │               │
│              │  ┌─────────────────────────────┐ │               │
│              │  │        CONVEX DB              │ │               │
│              │  │  agents, tasks, messages,     │ │               │
│              │  │  threads, sandbox, logs       │ │               │
│              │  │  Real-time subscriptions      │ │               │
│              │  └─────────────────────────────┘ │               │
│              └──────────────────────────────────┘               │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│         [Office Canvas] [Side Panels]  [Telegram Bot]           │
│         Pixel art 2D    Agent detail   Mirror chat              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack (Final)

| Layer | Technology | Package |
|-------|-----------|---------|
| **Frontend** | TanStack Start (Vite + React) | `apps/web/` |
| **Pixel Art** | HTML5 Canvas (pure) | Custom |
| **Styling** | Tailwind CSS v4 | `tailwindcss` |
| **UI Components** | shadcn/ui | Already in repo |
| **Backend** | Convex | `packages/backend/` |
| **AI Framework** | Vercel AI SDK v6 | `ai` |
| **AI Provider** | Mistral via AI SDK | `@ai-sdk/mistral` |
| **Agent Core** | Convex Durable Agents | `convex-durable-agents` |
| **Agent Threads** | Convex Agent | `@convex-dev/agent` |
| **Task Queue** | Convex Workpool | `@convex-dev/workpool` |
| **Auth** | Better Auth + Convex | `@convex-dev/better-auth` |
| **Sandbox** | Daytona SDK | `@daytonaio/sdk` |
| **Telegram** | grammy | `grammy` |
| **Voice (bonus)** | ElevenLabs | `@elevenlabs/client` |
| **Package Manager** | bun | Monorepo workspaces |

---

## Mistral Models

| Role | Model ID | Why |
|------|----------|-----|
| **Manager** | `mistral-large-latest` | Best reasoning, tool use, planning |
| **Code agents** | `codestral-2501` | Code-optimized, 256k context |
| **General agents** | `mistral-small-latest` | Fast, cheap, good enough |
| **Routing** | `ministral-8b-2410` | Ultra fast classification |
| **Reasoning** | `magistral-medium-2507` | Step-by-step when needed |

All switchable via AI SDK — just change the model string.

---

## Convex Schema

```typescript
// packages/backend/convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Sandbox state
  sandbox: defineTable({
    daytonaId: v.string(),
    status: v.union(
      v.literal("creating"),
      v.literal("running"),
      v.literal("stopped"),
      v.literal("archived"),
      v.literal("error")
    ),
    autoStopInterval: v.number(),
    lastActivity: v.number(),
    diskUsage: v.optional(v.string()),
    error: v.optional(v.string()),
  }),

  // Agent definitions (spawned workers)
  agents: defineTable({
    name: v.string(),
    type: v.union(v.literal("manager"), v.literal("worker")),
    role: v.string(), // "coder", "researcher", "copywriter", etc.
    status: v.union(
      v.literal("idle"),
      v.literal("thinking"),
      v.literal("working"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("despawning")
    ),
    model: v.string(), // AI SDK model id
    deskId: v.optional(v.number()),
    currentTaskId: v.optional(v.id("tasks")),
    threadId: v.optional(v.string()), // durable-agents thread
    workpoolId: v.optional(v.string()),
    color: v.string(), // sprite color
    position: v.object({ x: v.number(), y: v.number() }),
    reasoning: v.optional(v.string()),
    spawnedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_desk", ["deskId"]),

  // Tasks (kanban)
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("failed")
    ),
    assignedTo: v.optional(v.id("agents")),
    createdBy: v.union(v.literal("user"), v.literal("manager")),
    parentTaskId: v.optional(v.id("tasks")),
    dependsOn: v.optional(v.array(v.id("tasks"))),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
    estimatedMinutes: v.optional(v.number()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_assignedTo", ["assignedTo"])
    .index("by_parent", ["parentTaskId"]),

  // Messages (multi-channel)
  messages: defineTable({
    content: v.string(),
    role: v.union(
      v.literal("user"),
      v.literal("manager"),
      v.literal("agent"),
      v.literal("system")
    ),
    channel: v.union(
      v.literal("web"),
      v.literal("telegram")
    ),
    agentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_channel", ["channel"])
    .index("by_createdAt", ["createdAt"]),

  // Agent terminal output (streaming logs)
  agentLogs: defineTable({
    agentId: v.id("agents"),
    type: v.union(
      v.literal("stdout"),
      v.literal("stderr"),
      v.literal("command"),
      v.literal("status"),
      v.literal("tool_call"),
      v.literal("tool_result")
    ),
    content: v.string(),
    timestamp: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_agent_time", ["agentId", "timestamp"]),

  // Desk assignments
  desks: defineTable({
    position: v.object({ x: v.number(), y: v.number() }),
    label: v.optional(v.string()),
    occupiedBy: v.optional(v.id("agents")),
  }),
});
```

---

## Convex Config (Components)

```typescript
// packages/backend/convex/convex.config.ts

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

---

## File Structure (Target)

```
mistral-hack/
├── apps/web/
│   ├── src/
│   │   ├── components/
│   │   │   ├── office/           ← Pixel art canvas
│   │   │   │   ├── OfficeCanvas.tsx
│   │   │   │   ├── sprites/     ← Agent sprites, desks, items
│   │   │   │   ├── useOfficeRenderer.ts
│   │   │   │   └── constants.ts
│   │   │   ├── manager/          ← Manager island (bottom bar)
│   │   │   │   ├── ManagerIsland.tsx
│   │   │   │   ├── ManagerChat.tsx
│   │   │   │   └── TaskInput.tsx
│   │   │   ├── agent-panel/      ← Side panel on click
│   │   │   │   ├── AgentPanel.tsx
│   │   │   │   ├── KanbanTab.tsx
│   │   │   │   ├── TerminalTab.tsx
│   │   │   │   ├── FilesTab.tsx
│   │   │   │   └── ReasoningTab.tsx
│   │   │   ├── sandbox/          ← Sandbox status
│   │   │   │   └── SandboxIndicator.tsx
│   │   │   └── ui/              ← shadcn (existing)
│   │   ├── hooks/
│   │   │   ├── useAgentStream.ts
│   │   │   ├── useSandboxStatus.ts
│   │   │   └── useOfficeState.ts
│   │   ├── routes/
│   │   │   ├── index.tsx         ← Landing / redirect
│   │   │   ├── office.tsx        ← Main office view
│   │   │   └── __root.tsx
│   │   └── lib/
│   │       ├── canvas/           ← Canvas rendering utils
│   │       └── audio/            ← Sound effects (optional)
│   └── public/
│       └── sprites/              ← Pixel art assets
│
├── packages/backend/
│   ├── convex/
│   │   ├── schema.ts             ← Full schema (above)
│   │   ├── convex.config.ts      ← Components config
│   │   ├── auth.ts               ← Better Auth (existing)
│   │   ├── auth.config.ts
│   │   ├── http.ts               ← HTTP routes + Telegram webhook
│   │   │
│   │   ├── manager/              ← Manager agent
│   │   │   ├── agent.ts          ← Durable agent definition
│   │   │   ├── tools.ts          ← Manager tools (plan, delegate, spawn)
│   │   │   └── prompts.ts        ← System prompts
│   │   │
│   │   ├── agents/               ← Sub-agent definitions
│   │   │   ├── coder.ts          ← Code agent (uses Vibe headless)
│   │   │   ├── researcher.ts     ← Web search agent
│   │   │   └── registry.ts       ← Agent type registry
│   │   │
│   │   ├── sandbox/              ← Daytona integration
│   │   │   ├── lifecycle.ts      ← Create/start/stop/archive
│   │   │   ├── execute.ts        ← Run commands, sessions
│   │   │   └── vibe.ts           ← Vibe headless wrapper
│   │   │
│   │   ├── tasks/                ← Task management
│   │   │   ├── mutations.ts      ← CRUD
│   │   │   ├── queries.ts        ← List, filter
│   │   │   └── dependencies.ts   ← Dependency resolution
│   │   │
│   │   ├── office/               ← Office state
│   │   │   ├── queries.ts        ← Desk assignments, agent positions
│   │   │   └── mutations.ts      ← Spawn/despawn agents at desks
│   │   │
│   │   ├── telegram/             ← Telegram bot
│   │   │   ├── webhook.ts        ← Incoming messages
│   │   │   └── send.ts           ← Outgoing messages
│   │   │
│   │   └── logs/                 ← Agent logs
│   │       ├── mutations.ts      ← Append logs
│   │       └── queries.ts        ← Stream logs
│   │
│   └── package.json
│
├── packages/env/                 ← Env validation (existing)
└── packages/config/              ← Shared tsconfig (existing)
```

---

## Build Phases

### Phase 1: Foundation (2-3 hours)
**Goal:** Working backend with Manager agent + Convex real-time

1. **Schema** — Write full Convex schema (tables above)
2. **Dependencies** — Install `@ai-sdk/mistral`, `convex-durable-agents`, `@convex-dev/workpool`, `@daytonaio/sdk`
3. **Manager Agent** — Define durable agent with Mistral Large, basic system prompt, no tools yet
4. **Basic Chat** — Wire up Manager to web UI (reuse existing chat pattern, switch to Mistral)
5. **Office State** — Convex queries for desks, agents, tasks (no UI yet)

**Deliverable:** You can chat with the Manager in the web UI, messages persist.

### Phase 2: Sandbox Integration (2-3 hours)
**Goal:** Manager can create and control a Daytona sandbox

1. **Sandbox Lifecycle** — Convex actions to create/start/stop sandbox via Daytona SDK
2. **Command Execution** — Action to run shell commands in sandbox
3. **Vibe Headless** — Action to run `vibe --prompt "..." --auto-approve --output streaming`
4. **Manager Tools** — Give Manager tools: `createSandbox`, `runCommand`, `runVibeHeadless`
5. **Session Management** — Long-running processes via Daytona sessions
6. **Sandbox Status** — Real-time sandbox state in Convex DB

**Deliverable:** Manager can create a sandbox and run Vibe headless to build code.

### Phase 3: Sub-Agent Orchestration (2-3 hours)
**Goal:** Manager spawns sub-agents, tasks flow through workpool

1. **Workpool Setup** — Configure workpool with max parallelism (5 agents)
2. **Agent Spawn** — Manager tool to spawn a sub-agent (creates agent record, assigns desk, starts durable agent)
3. **Task System** — Create/assign/complete tasks, dependency checking
4. **Agent Types** — Coder (Vibe headless), Researcher (web search), General (Mistral Small)
5. **onComplete Flow** — When sub-agent finishes → update task → report to Manager → Manager decides next
6. **Logs Streaming** — Sub-agent output → `agentLogs` table → real-time subscription

**Deliverable:** Manager decomposes tasks, spawns agents, agents work in parallel, results flow back.

### Phase 4: Pixel Art Office UI (3-4 hours)
**Goal:** Visual 2D office with real-time agent activity

1. **Office Canvas** — Top-down 2D pixel art with 8 desks, Mistral branding (#FF7000, #FD3F29, #FFCB00)
2. **Sprite System** — Manager character, sub-agent characters (colored), idle/working animations
3. **Real-time Sync** — Convex subscriptions → canvas updates (agent spawn/despawn, status changes)
4. **Manager Island** — Fixed bottom bar with chat input, active task count, sandbox status
5. **Side Panel** — Click agent → Kanban tab, Terminal tab (streaming logs), Files tab
6. **Desk Assignment** — Agents appear at desks when spawned, disappear when done

**Deliverable:** Full visual office, agents visible at desks, click for details.

### Phase 5: Telegram Integration (1-2 hours)
**Goal:** Manager accessible via Telegram

1. **Bot Setup** — Create Telegram bot, configure webhook
2. **Webhook Handler** — Convex HTTP action receiving Telegram updates
3. **Message Routing** — Telegram message → Manager agent → response to Telegram + web UI
4. **Channel Mirror** — Web UI shows Telegram messages, Telegram gets web UI messages

**Deliverable:** Chat with Manager from phone, see it reflected in web office.

### Phase 6: Polish & Bonus Features (2-4 hours)
**Goal:** Demo-ready with wow factors

1. **Animations** — Smooth agent walk to desk, typing animation, spawn/despawn effects
2. **Sound Effects** — Keyboard clicks, notification sounds, ambient office
3. **Sandbox Status UI** — 🟢 Running / 🟡 Waking / ⚫ Sleeping indicator
4. **Task Dependencies** — Visual dependency lines in Kanban
5. **Terminal Streaming** — Real-time Vibe output on pixel art monitors
6. **ElevenLabs Voice** (high priority bonus) — "Call Manager" button, WebSocket voice chat
7. **Error Recovery** — Durable agents auto-resume after failures

**Deliverable:** Polished demo that targets multiple prize categories.

---

## Sub-Agent Coding Plan

When launching sub-agents to build in parallel, here's the split:

| Agent | Focus | Files |
|-------|-------|-------|
| **Agent 1** | Convex schema + Manager agent + tools | `packages/backend/convex/schema.ts`, `manager/`, `sandbox/` |
| **Agent 2** | Daytona SDK integration | `packages/backend/convex/sandbox/` |
| **Agent 3** | Sub-agent orchestration + Workpool | `packages/backend/convex/agents/`, `tasks/` |
| **Agent 4** | Pixel art office canvas | `apps/web/src/components/office/` |
| **Agent 5** | Manager island + chat UI | `apps/web/src/components/manager/` |
| **Agent 6** | Agent side panel (Kanban, Terminal, Files) | `apps/web/src/components/agent-panel/` |
| **Agent 7** | Telegram bot integration | `packages/backend/convex/telegram/` |
| **Agent 8** | Office state + real-time hooks | `apps/web/src/hooks/`, `packages/backend/convex/office/` |

Dependencies:
- Agent 1 must finish schema first → others can start
- Agents 4-6 (UI) can work in parallel once schema exists
- Agent 7 (Telegram) needs Agent 1 (Manager) done first
- Agent 2 (Daytona) is independent

---

## Environment Variables

```env
# Mistral (required)
MISTRAL_API_KEY=

# Daytona (required)
DAYTONA_API_KEY=
DAYTONA_API_URL=https://app.daytona.io/api
DAYTONA_TARGET=us

# Telegram (required for Phase 5)
TELEGRAM_BOT_TOKEN=

# ElevenLabs (optional, Phase 6)
ELEVENLABS_API_KEY=

# Convex (auto-configured)
CONVEX_DEPLOYMENT=
```

Set these in Convex dashboard (Environment Variables) and in `.env.local` for dev.

---

## Key Technical Decisions

1. **Durable Agents over raw Agent** — Long-running tool loops survive crashes
2. **AI SDK v6** — Provider-agnostic, can switch from Mistral to anything
3. **Single Daytona sandbox** — All agents share one computer (cheaper, collaborative)
4. **Workpool for parallelism** — Not raw scheduler, controlled concurrency
5. **Convex subscriptions for real-time** — No polling, push-based UI updates
6. **HTML5 Canvas (pure)** — No PixiJS needed for top-down 2D at this scale
7. **TanStack Start** — Already in repo, keep it
8. **bun** — Already configured as package manager

---

## Target Prizes Alignment

| Prize | How we target it |
|-------|-----------------|
| **Best Agent Skills** | Multi-agent orchestration, durable agents, real computer use, task dependencies |
| **Best Vibe** | Pixel art + literally using Mistral Vibe CLI as the coding engine |
| **Supercell Video Game** | Pixel art office looks/feels like a game, agent characters, animations |
| **1st Place / Global** | Novel concept (visual agent workspace), real utility, impressive demo |
| **ElevenLabs** | Voice call with Manager agent (Phase 6 bonus) |
