# Task Status — AI Office Hackathon

> Last updated: 2026-02-28

## Legend

- ✅ Done
- 🟡 Partially done (scaffolded / DB layer only)
- ❌ Not started

---

## DEV 2 — Backend (Convex + Daytona + Agents)

### Phase 1: Foundation (2-3h) — ✅ COMPLETE

| # | Task | Status | Notes |
|---|------|--------|-------|
| B1 | Install deps: @ai-sdk/mistral, convex-durable-agents, @convex-dev/workpool | ✅ | All installed. **Missing: @daytonaio/sdk** |
| B2 | Full Convex schema | ✅ | 6 tables: sandbox, agents, tasks, messages, agentLogs, desks — all indexed |
| B3 | convex.config.ts: durableAgents, workpool | ✅ | betterAuth + agent + durableAgents + workpool all configured |
| B4 | Manager agent definition | ✅ | `convex/agent.ts` — managerAgent (mistral-large-latest), coderAgent (codestral-latest), generalAgent (mistral-small-latest) |
| B5 | defineAgentApi for Manager | ✅ | `convex/manager/api.ts` — createThread, sendMessage, listMessages, streamUpdates, stopThread, resumeThread |
| B6 | Manager tools | ✅ | `convex/manager/tools.ts` — spawnAgent, createTask, updateTaskStatus (fully implemented, not empty stubs) |

### Phase 2: Sandbox Integration (2-3h) — ❌ NOT STARTED

| # | Task | Status | Notes |
|---|------|--------|-------|
| B7 | Daytona sandbox lifecycle | ❌ | DB layer exists (`convex/sandbox/mutations.ts`: ensureSandbox, updateStatus) but **NO Daytona SDK calls**. Need `@daytonaio/sdk` install + actual createSandbox, startSandbox, stopSandbox actions |
| B8 | Command execution action | ❌ | No `runCommand(sandboxId, command)` exists. Need Daytona SDK `sandbox.process.executeCommand()` |
| B9 | Vibe headless wrapper | ❌ | No `runVibeHeadless` exists. Need Daytona sessions for long-running tasks, stream to agentLogs |
| B10 | Sandbox status mutation | 🟡 | `updateStatus` mutation exists in DB, but not connected to real Daytona events |

### Phase 3: Sub-Agent Orchestration (2-3h) — 🟡 PARTIAL

| # | Task | Status | Notes |
|---|------|--------|-------|
| B11 | Workpool setup | ✅ | `convex/workpool.ts` — agentPool with maxParallelism: 5, retry 3x |
| B12 | Sub-agent runner action | ❌ | `enqueueWorkpoolAction` exported but **never called**. No runner that executes tasks in Daytona sandbox |
| B13 | onComplete handler | ❌ | No handler to update task/agent status and notify Manager on completion |
| B14 | Agent spawn mutation | ✅ | `convex/office/mutations.ts` — spawnAgent, spawnAgentInternal (creates agent, assigns desk) |
| B15 | Agent despawn mutation | ✅ | `convex/office/mutations.ts` — despawnAgent (marks despawning, frees desk) |
| B16 | Task CRUD | ✅ | `convex/tasks/mutations.ts` — full CRUD: create, updateStatus, assign, complete, remove |
| B17 | Task dependency check | ❌ | `dependsOn` field exists in schema but no pre-start validation logic |

### Phase 4: Telegram (1-2h) — ❌ NOT STARTED

| # | Task | Status | Notes |
|---|------|--------|-------|
| B18 | Telegram webhook handler | ❌ | No `convex/telegram/` directory. Schema supports `channel: "telegram"` but no handler |
| B19 | Telegram send action | ❌ | Not started |
| B20 | HTTP route for webhook | ❌ | `convex/http.ts` exists but no `/telegram` route |

---

## DEV 3 — Frontend (Pixel Art + UI + Real-time)

### Phase 1: Canvas Engine (3-4h) — ✅ COMPLETE

| # | Task | Status | Notes |
|---|------|--------|-------|
| F1 | OfficeCanvas.tsx component | ✅ | Full Canvas 2D with RAF game loop, imageSmoothingEnabled=false |
| F2 | Tile grid renderer | ✅ | 16x16 tiles, configurable grid, floor + wall tiles |
| F3 | Z-sorted scene renderer | ✅ | Flat array sorted by zY, back-to-front rendering |
| F4 | Character sprites | ✅ | Multiple palettes, 16x24px, 4 directions, walk/type/idle frames |
| F5 | Character state machine | ✅ | IDLE→WALK→TYPE, BFS pathfinding, lerp movement |
| F6 | Furniture sprites | ✅ | Desks, chairs, monitors (on/off state), plants, bookshelves via furnitureCatalog |
| F7 | Matrix rain spawn/despawn | ✅ | Per-column sweep, bright head + fading green trail in `matrixEffect.ts` |
| F8 | Zoom + Pan controls | ✅ | Scroll zoom + middle-mouse drag, clamped to bounds |
| F9 | Sprite cache system | ✅ | Offscreen canvas cache at current zoom level |

### Phase 2: UI Components (2-3h) — 🟡 PARTIAL

| # | Task | Status | Notes |
|---|------|--------|-------|
| F10 | Manager Island (bottom bar) | ❌ | No bottom-bar component. Chat exists only on separate `/ai` route |
| F11 | Wire Manager chat to Convex | ✅ | `/ai` route uses useUIMessages + useSmoothText from @convex-dev/agent/react |
| F12 | Agent labels (floating) | ✅ | Canvas engine renders floating labels with status dots |
| F13 | Click-to-select agent | ✅ | Click handler exists in OfficeCanvas (but has `vscode.postMessage` bug) |
| F14 | Agent side panel | ❌ | No AgentPanel, no slide-from-right panel |
| F15 | Terminal tab | ❌ | No terminal component subscribing to agentLogs |
| F16 | Kanban tab | 🟡 | KanbanItem + KanbanEmptyState components exist but not wired to a panel |

### Phase 3: Real-time Integration (1-2h) — ❌ NOT STARTED

| # | Task | Status | Notes |
|---|------|--------|-------|
| F17 | useOfficeState hook | ❌ | OfficeState is standalone JS class, not connected to Convex subscriptions |
| F18 | Agent spawn animation | ❌ | Matrix rain effect exists in engine but not triggered by DB changes |
| F19 | Agent despawn animation | ❌ | Same — effect exists but no DB trigger |
| F20 | Monitor auto-state | ✅ | Canvas engine already toggles monitors on/off based on agent active state |
| F21 | Sandbox status indicator | ❌ | No UI component |

### Phase 4: Polish (1-2h) — 🟡 PARTIAL

| # | Task | Status | Notes |
|---|------|--------|-------|
| F22 | Mistral branding (orange) | 🟡 | Orange accent used in some components, not consistently applied |
| F23 | Pixel font | ❌ | No Press Start 2P or pixel font loaded |
| F24 | Ambient particles | ❌ | No floating orange embers |
| F25 | Sound effects | ❌ | Not started |

---

## LÉONARD — Lead

| # | Task | Status | Notes |
|---|------|--------|-------|
| L1 | Convex deployment + env vars | 🟡 | Convex set up, VITE_CONVEX_URL configured. Need MISTRAL_API_KEY, DAYTONA_API_KEY server-side env |
| L2 | Telegram bot setup | ❌ | Not started |
| L3 | Office layout design | ✅ | Layout exists (2x4 desk grid, multiple room prototypes v2-v9) |
| L4 | Manager system prompt | ✅ | Full system prompt in `convex/agent.ts` — personality, planning, delegation |
| L5 | Integration testing | ❌ | End-to-end flow not tested yet |
| L6 | Pixel art style finalized | ✅ | Style established through prototype iterations |
| L7 | Demo script | ❌ | Not started |
| L8 | README + video | ❌ | Not started |
| L9 | ElevenLabs voice | ❌ | Bonus — not started |
| L10 | Deploy to Vercel | ❌ | Not deployed yet |

---

## Summary

| Area | Done | Partial | Not Started | Total |
|------|------|---------|-------------|-------|
| Backend Phase 1 (Foundation) | 6 | 0 | 0 | 6 |
| Backend Phase 2 (Sandbox) | 0 | 1 | 3 | 4 |
| Backend Phase 3 (Orchestration) | 3 | 0 | 3 | 6 (+1 workpool ✅) |
| Backend Phase 4 (Telegram) | 0 | 0 | 3 | 3 |
| Frontend Phase 1 (Canvas) | 9 | 0 | 0 | 9 |
| Frontend Phase 2 (UI) | 3 | 1 | 3 | 7 |
| Frontend Phase 3 (Real-time) | 1 | 0 | 4 | 5 |
| Frontend Phase 4 (Polish) | 0 | 1 | 3 | 4 |
| Léonard (Lead) | 3 | 1 | 6 | 10 |
| **TOTAL** | **25** | **4** | **25** | **54** |

**~54% complete.** Critical gaps: Daytona integration, sub-agent execution, real-time bridge, production office route.
