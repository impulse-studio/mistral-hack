# AI Office — Hackathon Mistral 2026 — Project Brief (v5)

## One-Liner
An open-source visual AI agent platform — inspired by OpenClaw's architecture — where a Manager agent (accessible via Telegram + web UI) orchestrates sub-agents working on a shared persistent computer. Pixel-art office visualization. Mistral-native. Real computer use via Mistral Vibe headless. Smart sandbox lifecycle (sleep/wake).

---

## Concept

A 2D pixel-art open office where you **see** your AI agents work. The Manager agent is the central brain — you talk to it via **Telegram** (or the web UI). It plans, delegates, and monitors sub-agents who execute tasks on a **shared persistent Daytona sandbox**.

The coding sub-agents run **Mistral Vibe CLI in headless mode** (`--auto-approve --prompt`) inside the sandbox. Other sub-agents use Mistral Agents API with function calling for non-code tasks.

**Inspired by OpenClaw's architecture:**
- Gateway pattern: central process routing messages between channels and agent brain
- Session management: persistent conversations with context
- Tool execution: agents call tools, results stream back
- Channel abstraction: same agent, multiple surfaces (Telegram, web UI)

---

## Technology Landscape

### Agent Brain: Mistral (Everything Mistral)

#### Mistral Agents API
| Feature | What it does | Why it matters |
|---------|-------------|----------------|
| **Agent Handoffs** | Native delegation between agents | Manager → sub-agent is built-in |
| **Built-in Code Interpreter** | Python sandbox | Quick calcs without Daytona |
| **Built-in Web Search** | Real-time web access | Research tasks out of the box |
| **Function Calling** | Structured tool calls | Connect to Daytona, files, APIs |
| **Persistent Conversations** | Context across turns | Manager remembers project state |
| **MCP Support** | Model Context Protocol | Plug into any MCP tool server |

**Models:**
- `mistral-large-latest` — Manager (best reasoning)
- `codestral-latest` — Code-focused sub-agents
- `mistral-medium-latest` — General sub-agents
- `mistral-small-latest` — Fast routing/classification

#### Mistral Vibe CLI (Headless) — Default Coding Tool for Sub-Agents

Instead of building a custom coding agent, sub-agents that write code use **Mistral Vibe** running inside the Daytona sandbox in headless mode.

```bash
# How a coding sub-agent works inside Daytona:
mistral-vibe --prompt "Create a Next.js landing page with hero section,
  pricing table, and contact form. Use pnpm. Deploy-ready." \
  --auto-approve \
  --non-interactive
```

**Why Mistral Vibe headless:**
- Mistral's own coding agent — judges will love it (eating your own dog food)
- `--auto-approve` = no human confirmation needed
- `--prompt` / pipe mode = fully programmatic
- Powered by Devstral 2 — multi-file edits, 256k context
- Handles file exploration, code writing, testing, iteration automatically
- Runs inside Daytona — persistent files, shared with other agents

**How it maps to the office:**
- User gives task to Manager
- Manager decides "this is a coding task" → spawns CodeBot at a desk
- CodeBot = runs `mistral-vibe --prompt "..." --auto-approve` inside Daytona
- Vibe's terminal output streams to the pixel art monitor in real-time
- When Vibe finishes, CodeBot reports back to Manager

### Computer Use: Daytona Sandbox

**One persistent sandbox = the company's computer.**

#### Sandbox Lifecycle & Cost Management

```
  RUNNING ──(auto-stop after inactivity)──▶ STOPPED ──(auto-archive)──▶ ARCHIVED
    💻                                        💾                          📦
    Agent working                             FS persists                 Cheap storage
    ~$0.07/h                                  ~$0.0001/h (disk only)     ~free
    CPU + RAM + Disk                          Disk only                  Object storage
                                              ▲                          ▲
                                              │ start() ~seconds         │ start() ~30s
                                              └──────────────────────────┘
```

| State | What persists | Cost | Wake-up time |
|-------|--------------|------|-------------|
| **Running** | Everything (live) | ~$0.55/h (4 vCPU, 8GB RAM) | N/A |
| **Stopped** | Filesystem (repos, packages, configs) | ~$0.0001/h (disk only) | Few seconds |
| **Archived** | Filesystem (moved to object storage) | Near zero | ~30s depending on size |

**Key settings:**
- `autoStopInterval: 15` — auto-stop after 15 min idle (default)
- `autoStopInterval: 0` — keep running indefinitely (use while agents work)

**The flow for long-running agent sessions:**

```typescript
// 1. User sends task → wake up sandbox if needed
const sandbox = await daytona.get(sandboxId);
if (sandbox.state !== "running") {
  await sandbox.start(); // Wake up: seconds (stopped) or ~30s (archived)
}

// 2. Disable auto-stop while agents are working
await sandbox.setAutoStopInterval(0); // Stay alive

// 3. Agents work for hours (Vibe headless, terminal commands, etc.)
//    Multiple agents can run in parallel as separate processes
//    All share the same filesystem

// 4. When all tasks are done → re-enable auto-stop
await sandbox.setAutoStopInterval(15); // Sleep after 15 min idle
// Sandbox auto-stops → filesystem persists → costs drop to ~nothing
```

**Recommended sandbox size: 4 vCPU, 8GB RAM, 10GB disk**

#### What the sandbox contains

```
/home/company/                    ← persistent root
├── repos/                        ← cloned Git repos (persist forever)
│   ├── frontend/
│   ├── backend/
│   └── landing-page/
├── docs/                         ← research, specs, notes
├── outputs/                      ← agent deliverables
├── .config/                      ← tool configs
├── node_modules/ (global)        ← installed packages persist
└── .mistral-vibe/                ← Vibe CLI config/cache
```

**All agents share this filesystem.** Agent-1 clones a repo → Agent-2 can edit it. Agent-3 installs a package → everyone has it.

**Alternatives if Daytona doesn't work:** E2B (24h max persistence), Scrapybara (VNC desktop), or a simple VPS with SSH.

### Architecture Pattern: Inspired by OpenClaw

```
OpenClaw:                          AI Office:
─────────                          ──────────
Gateway daemon                     Next.js server / Convex
  ├── Telegram channel      →      Telegram Bot (Manager input)
  ├── Web channel           →      Web UI (pixel art office)
  ├── Agent loop            →      Manager agent (Mistral)
  ├── Session manager       →      Convex (persistent state)
  ├── Tool execution        →      Daytona sandbox
  └── Sub-agent spawning    →      Sub-agent processes in sandbox
```

**Key patterns:**
1. **Channel abstraction** — Manager accessible from Telegram AND web UI. Same brain, different surfaces.
2. **Session persistence** — Conversations persist. Manager remembers context.
3. **Gateway routing** — Telegram message → Manager agent → response on same channel + web UI update.
4. **Tool execution with streaming** — Agents call tools, output streams back real-time.
5. **Workspace** — Daytona sandbox = the agent's workspace (like OpenClaw's `~/.openclaw/workspace`).

### Telegram Integration

The Manager agent is a **Telegram bot**:
- Send tasks from your phone
- Receive results, status updates, progress reports
- Web UI shows the same conversation + visual office
- When you message the Manager on Telegram → you see the Manager "receive" the message on the pixel art office

```
Telegram message → Bot webhook → Manager agent → Convex → Web UI updates
Web UI input → Convex → Manager agent → Response on web + Telegram
```

**Libraries:** `grammy`, `telegraf`, or raw Telegram Bot API with Next.js webhook route.

### Real-time Backend Options

| Solution | Real-time | Why consider |
|----------|-----------|-------------|
| **Convex** | Native subscriptions | Zero config, TypeScript, instant |
| **Supabase** | Postgres realtime | If you prefer SQL |
| **PartyKit** | Edge real-time | Lightweight |

### Frontend

- **HTML5 Canvas** for pixel art (proven in prototype)
- **PixiJS** if you need sprite management
- **Next.js 15** App Router
- **pnpm** as package manager

### Voice (Optional)
- **ElevenLabs** for Manager voice — adds wow to demos

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    CHANNELS                          │
│  [Telegram Bot] ──────┐                             │
│  [Web UI Input] ──────┤                             │
│                       ▼                             │
│              ┌─────────────────┐                    │
│              │  MANAGER AGENT  │                    │
│              │  (Mistral Large) │                    │
│              │  - Plans tasks   │                    │
│              │  - Delegates     │                    │
│              │  - Reports back  │                    │
│              └────────┬────────┘                    │
│                       │ Agent handoffs               │
│         ┌─────────────┼─────────────┐               │
│         ▼             ▼             ▼               │
│    ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│    │ CodeBot │  │Research │  │ CopyBot │           │
│    │ (Vibe   │  │  Bot    │  │(Mistral)│           │
│    │ headless│  │(web     │  │         │           │
│    │ in      │  │ search) │  │         │           │
│    │ Daytona)│  │         │  │         │           │
│    └────┬────┘  └────┬────┘  └────┬────┘           │
│         │            │            │                  │
│         ▼            ▼            ▼                  │
│    ┌────────────────────────────────────┐           │
│    │  DAYTONA SANDBOX (shared, persistent)│         │
│    │  Smart lifecycle: running/stopped/archived     │
│    │  Mistral Vibe CLI pre-installed    │           │
│    │  Shared filesystem for all agents  │           │
│    │  Auto-stop when idle, auto-wake on task       │
│    └────────────────────────────────────┘           │
│                       │                              │
│                       ▼ Real-time updates            │
│              ┌─────────────────┐                    │
│              │   CONVEX / DB   │                    │
│              │  agents, tasks, │                    │
│              │  logs, messages │                    │
│              └────────┬────────┘                    │
│                       │ Subscriptions                │
│         ┌─────────────┼─────────────┐               │
│         ▼             ▼             ▼               │
│    [Web Canvas]  [Side Panels]  [Telegram]          │
│    Pixel art     Kanban/Terminal  Bot messages       │
│    office        per agent       to user            │
└─────────────────────────────────────────────────────┘
```

---

## UI Overview

### The Office (2D Canvas)
- Top-down pixel art open space with ~8 desks
- Mistral branding: orange #FF7000, red #FD3F29, yellow #FFCB00
- Dark moody background, glowing monitors, ambient particles
- Press Start 2P pixel font
- Sandbox status indicator (running / waking / sleeping)

### Manager Island (Fixed Bottom)
- Always visible fixed bottom bar
- Manager avatar + status + active task count + sandbox status
- Natural language input: "Give the manager a task..."
- Click → expands to Manager Kanban + conversation history

### Agent Side Panel (Click any desk/agent)
- **Kanban tab:** TODO / In Progress / Done columns
- **Terminal tab:** Live streaming output from Daytona (Vibe headless or shell)
- **Files tab:** Browse agent's working directory in sandbox
- **Reasoning tab:** Why the agent chose this approach
- Close button (X)

### Telegram Mirror
- Same Manager, accessible via Telegram
- Send tasks from phone → see them appear on the web office
- Receive results and status updates
- Web UI reflects Telegram conversations in real-time

---

## How It Works End-to-End

### Short task (~minutes)
```
1. User: "Research the top 5 competitors for fitness SaaS" (via Telegram or web)
2. Manager wakes sandbox if needed (few seconds)
3. Manager spawns ResearchBot at Desk 1
4. ResearchBot uses Mistral web search → writes report to /home/company/docs/
5. ResearchBot reports back → Manager summarizes to user
6. ResearchBot despawns → desk becomes empty
7. After 15 min idle → sandbox auto-stops (costs drop)
```

### Long task (~hours)
```
1. User: "Build a complete SaaS landing page with auth and payments"
2. Manager wakes sandbox, disables auto-stop (agents will work for hours)
3. Manager plans 5 subtasks:
   a. CodeBot → scaffold Next.js project (Vibe headless)
   b. ResearchBot → research competitor designs
   c. CopyBot → write landing page copy
   d. CodeBot → implement auth (Vibe headless, reads CopyBot's files)
   e. CodeBot → add Stripe payments (Vibe headless)
4. Agents spawn at desks, work in parallel where possible
5. CodeBot runs Vibe headless for each subtask — terminal streams to UI
6. CopyBot writes files → CodeBot reads them (shared FS!)
7. Dependencies: CodeBot waits for CopyBot before integrating copy
8. Manager monitors progress, re-assigns if an agent fails
9. After all done → Manager compiles results, reports to user
10. Auto-stop re-enabled → sandbox sleeps after 15 min
11. Total time: 2-4 hours, sandbox cost: ~$1.10-2.20
```

---

## Suggested Schema

```typescript
// Flexible — coding agent should adapt as needed

sandbox: {
  status (booting|running|stopped|archived),
  daytonaId, diskUsage, uptime, autoStopInterval
}

agents: {
  name, type (manager|worker), status (idle|thinking|working|completed|despawning),
  color, deskId, currentTaskId, position,
  reasoning, terminalOutput, workingDir,
  mistralAgentId,
  toolType // "vibe-headless" | "mistral-api" | "web-search" | "code-interpreter"
}

tasks: {
  title, description,
  status (backlog|todo|in_progress|review|done),
  assignedTo, createdBy, parentTaskId,
  dependsOn[], // task IDs this depends on
  result, estimatedMinutes
}

messages: {
  from, to, content, channel (web|telegram),
  type (chat|task_assignment|status_update|tool_call|result)
}

agentLogs: {
  agentId, action, detail, command, output, timestamp
}
```

---

## Build Priority

1. **Pixel art office + Manager island** — visual foundation
2. **Real-time backend** (Convex or alternative) — state → UI
3. **Telegram bot** — Manager accessible via Telegram
4. **Mistral Manager agent** — receives tasks, plans, delegates
5. **Daytona sandbox** — persistent shared computer with lifecycle
6. **Mistral Vibe headless** in sandbox — coding sub-agents
7. **Sub-agent spawn + terminal streaming** — live output on monitors
8. **Kanban side panel** — click agent → see tasks/terminal/files
9. **Task dependencies** — agents wait for each other when needed
10. **Polish** — animations, sound, voice, sandbox status UI

---

## Target Prizes
- **1st Place / Global Winner** — novel concept, real utility, impressive demo
- **Best Agent Skills** — multi-agent orchestration + Vibe headless + real computer use
- **Best Vibe** — pixel art Mistral aesthetic (and literally using Mistral Vibe)
- **Supercell Video Game** — it looks and feels like a game
- **ElevenLabs** — Manager speaks results via voice

---

## Hard Requirements
1. **Mistral** for agent intelligence (it's their hackathon)
2. **Mistral Vibe headless** as the default coding tool for sub-agents
3. **Visual pixel-art office** (the differentiator — agents visible at desks)
4. **Real computer use** on a persistent shared sandbox (Daytona preferred)
5. **Smart sandbox lifecycle** — sleep when idle, wake on task, persist everything
6. **Real-time updates** — agents work → UI reflects instantly
7. **Telegram integration** for the Manager (at minimum)
8. **pnpm** as package manager
9. **Kanban per agent** — click to see task queue, terminal, files
10. **Long-running support** — agents can work for hours on complex tasks
