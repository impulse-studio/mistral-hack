# Plan: Frontend — Remaining Work

> Owner: DEV 3 | Canvas engine ✅ done, UI + real-time integration remaining
> Estimated: ~5-6h total

---

## Phase 2: UI Components (remaining)

### F10 — Manager Island (bottom bar) | ~1h

Create `apps/web/src/components/ManagerIsland.tsx`

A fixed bottom bar overlaying the office canvas:
```
┌──────────────────────────────────────────────┐
│  [🤖 Manager] [status] [tasks: 3]  [🟢 sandbox] │
│  ┌────────────────────────────────────────┐  │
│  │ Give the manager a task...             │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

- Fixed position bottom, full width, pixel-art styled
- Chat input (reuse the streaming logic from `/ai` route)
- Task count badge (subscribe to `tasks.queries.list`)
- Sandbox status indicator (subscribe to `sandbox.queries.getStatus`)
- Mistral orange accent on active elements

### F14 — Agent Side Panel | ~1.5h

Create `apps/web/src/components/AgentPanel.tsx`

Slides from right when an agent is clicked on canvas:
- Header: agent name, role badge, status dot
- Tab bar: Kanban | Terminal | Files | Reasoning
- Close button (X or click elsewhere)

### F15 — Terminal Tab | ~45min

Create `apps/web/src/components/AgentTerminal.tsx`

- Subscribe to `agentLogs` via `useQuery(api.logs.queries.streamForAgent, { agentId })`
- Render as scrolling green-on-black terminal (monospace font)
- Auto-scroll to bottom
- Log type color coding: stdout=green, stderr=red, command=yellow, status=cyan

### F16 — Kanban Tab | ~30min

Create `apps/web/src/components/AgentKanban.tsx`

- Use existing `KanbanItem` + `KanbanEmptyState` components
- 3 columns: Todo | In Progress | Done
- Subscribe to `tasks.queries.listByAgent` filtered by selected agent
- Cards show title, status, time info

---

## Phase 3: Real-time Integration

### F17 — useOfficeState hook | ~1.5h

Create `apps/web/src/hooks/useOfficeState.ts`

**This is the critical bridge between Convex DB and the canvas engine.**

```typescript
import { useQuery } from "convex/react";
import { api } from "@mistral-hack/backend/convex/_generated/api";

export function useOfficeState(officeState: OfficeState | null) {
  const agents = useQuery(api.office.queries.getActiveAgents);
  const desks = useQuery(api.office.queries.getDesks);

  useEffect(() => {
    if (!officeState || !agents) return;

    // Sync agents: add new ones, remove gone ones, update statuses
    const currentIds = new Set(officeState.getAgentIds());
    const dbIds = new Set(agents.map(a => a._id));

    // Spawn new agents (with matrix effect)
    for (const agent of agents) {
      if (!currentIds.has(agent._id)) {
        officeState.addAgent(agent._id, undefined, undefined, agent.deskId);
      }
    }

    // Remove despawned agents
    for (const id of currentIds) {
      if (!dbIds.has(id)) {
        officeState.removeAgent(id);
      }
    }

    // Update active states
    for (const agent of agents) {
      const isActive = agent.status === "working" || agent.status === "thinking";
      officeState.setAgentActive(agent._id, isActive);
    }
  }, [agents, officeState]);
}
```

### F18-F19 — Spawn/Despawn Animations | included in F17

The matrix rain effects already exist in `matrixEffect.ts`. The `addAgent()` and `removeAgent()` methods on `OfficeState` already trigger them. Just needs to be called from the `useOfficeState` hook when agents appear/disappear in DB.

### F21 — Sandbox Status Indicator | ~30min

Part of Manager Island (F10). Subscribe to `sandbox.queries.getStatus`:
- 🟢 Running — sandbox active
- 🟡 Creating — sandbox starting
- ⚫ Stopped — sandbox sleeping
- 🔴 Error — sandbox error

---

## Phase 4: Polish

### F22 — Mistral Branding | ~30min

- Orange `#FF7000` accent on:
  - Manager Island active elements
  - Selected agent highlight
  - Task badges
  - Active monitors glow
- Dark moody palette already in place from canvas prototypes

### F23 — Pixel Font | ~15min

```css
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
```

Apply to all text overlays, Manager Island, side panel headers.

### F24 — Ambient Particles | ~30min

Add to canvas render loop:
- Subtle floating orange embers/dots
- Small count (~15-20 particles)
- Slow upward drift with slight horizontal sway
- Fade in/out lifecycle

### F25 — Sound Effects | ~30min (optional)

- Keyboard clicks when agent is in TYPE state
- Notification chime on task complete
- Subtle ambient hum
- Use Web Audio API, keep volume low

---

## Production Office Route

**NOT in the original task list but CRITICAL**: Mount the canvas + UI in a proper route.

Create `apps/web/src/routes/office.tsx`:
- Full-screen layout: OfficeCanvas fills viewport
- ManagerIsland fixed at bottom
- AgentPanel slides from right on agent click
- Connect useOfficeState hook
- No header/nav — immersive experience

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/routes/office.tsx` | Main office route (canvas + all UI) |
| `src/components/ManagerIsland.tsx` | Bottom bar with chat + status |
| `src/components/AgentPanel.tsx` | Right side panel with tabs |
| `src/components/AgentTerminal.tsx` | Terminal tab content |
| `src/components/AgentKanban.tsx` | Kanban tab content |
| `src/hooks/useOfficeState.ts` | Convex ↔ Canvas bridge |
| `src/components/SandboxIndicator.tsx` | Sandbox status dot |

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/pixel-agents/OfficeCanvas.tsx` | Remove `vscode.postMessage` bug, add onAgentClick callback prop |
| `src/routes/__root.tsx` | Add /office route |
