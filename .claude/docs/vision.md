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
