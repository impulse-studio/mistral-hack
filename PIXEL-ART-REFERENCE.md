# Pixel Art Office — Visual Design Reference

> Based on analysis of [pixel-agents](https://github.com/pablodelucca/pixel-agents) by pablodelucca.
> This is our visual reference — we reproduce the same style and feel, adapted with Mistral branding.

---

## Engine Architecture (from pixel-agents)

The pixel-agents project uses a **pure Canvas 2D** approach — no game frameworks, no PixiJS:

### Core Engine Pattern
```
startGameLoop(canvas, { update, render })
  → requestAnimationFrame loop
  → update(dt) — character movement, state machines, timers
  → render(ctx) — clear, draw tiles, z-sort furniture+characters, draw overlays
```

### Key Technical Decisions We Copy
1. **16x16 tile grid** — `TILE_SIZE = 16`, everything snaps to this grid
2. **Zoom system** — integer zoom (1-10x), `ctx.imageSmoothingEnabled = false` for crisp pixels
3. **Z-sorting** — all furniture + characters in one flat array, sorted by `zY` (bottom edge), drawn back-to-front
4. **Sprite data = 2D arrays of hex colors** — `SpriteData = string[][]` — each pixel is a hex string or `''` for transparent
5. **Sprite cache** — sprites rendered once to offscreen canvas at current zoom, reused per frame
6. **Character state machine** — IDLE → WALK → TYPE (with BFS pathfinding between tiles)
7. **Device pixel ratio aware** — canvas backing store = CSS size × DPR, no ctx.scale
8. **Pan + zoom** — middle-mouse drag to pan, scroll to zoom, clamped to map bounds

### Rendering Pipeline
```typescript
renderFrame(ctx, w, h, tileMap, furniture, characters, zoom, pan, ...) {
  1. ctx.clearRect(0, 0, w, h)
  2. Compute offset = center map in viewport + pan
  3. renderTileGrid() — floor tiles + wall base colors
  4. Collect all drawables (furniture + characters) into ZDrawable[]
  5. Sort by zY (lower = drawn later = in front)
  6. Draw all sorted drawables
  7. renderBubbles() — speech bubbles above characters
  8. Editor overlays (if edit mode)
}
```

---

## Visual Style

### Color Palette

**Background & Walls:**
```css
--pixel-bg: #1e1e2e;         /* Dark blue-gray — main background */
--pixel-border: #4a4a6a;     /* Medium border */
--pixel-border-light: #6a6a8a;
```

**Accent colors (original — we swap for Mistral):**
```css
--pixel-accent: #5a8cff;     /* Blue accent → SWAP to Mistral Orange #FF7000 */
--pixel-green: #5ac88c;      /* Green for agents → KEEP */
```

**Our Mistral Adaptation:**
```css
--mistral-orange: #FF7000;   /* Primary accent */
--mistral-red: #FD3F29;      /* Error, danger, alerts */
--mistral-yellow: #FFCB00;   /* Highlights, active states */
--mistral-dark: #1e1e2e;     /* Keep the dark background */
--agent-green: #5ac88c;      /* Agent indicators (keep from pixel-agents) */
```

### Floor Types
The original has 7 floor types + void:
- **Warm brown wood** (main office) — most used
- **Light cream tiles** (break room)
- **Teal/blue carpet** (private office)
- **Void** (transparent, outside the office)

For us: **dark/moody wood floors** with subtle Mistral orange warm tones.

### Tile Size
- Base tile: **16×16 pixels**
- Default grid: **20×11 tiles** (320×176 base pixels)
- Zoomed: 3-5x for typical screens → 960-1600px wide

### Character Sprites
- **16×24 pixels** per frame (1 tile wide, 1.5 tiles tall)
- **6 diverse palettes** (skin tones, hair colors)
- **Hue shift** for repeated palettes (≥45° shift)
- **States:** idle (static), walk (4 frames), type (2 frames), read (2 frames)
- **Directions:** down, left, right, up
- Characters anchored at **bottom-center** of sprite

### Furniture Sprites
All hand-drawn as `SpriteData = string[][]` (pixel-by-pixel hex colors):
- **Desks** — 32×32 (2×2 tiles), brown wood, darker edges
- **Chairs** — 16×16 (1×1), positioned at desk seats
- **Monitors/PCs** — on desks, gray/white screens with colored content
- **Bookshelves** — 16×32 (1×2 tiles), colorful book spines
- **Plants** — 16×24, green leaves in brown/white pots
- **Water coolers, lamps, whiteboards** — 1×1 tile each

### Z-Sorting
```
Characters sorted by: ch.y + TILE_SIZE/2 + 0.5 (bottom of their tile + offset)
Furniture sorted by: bottom edge y position (zY)
→ Everything in one array, sorted, drawn back-to-front
→ Characters appear in front of same-row chairs but behind lower-row desks
```

---

## Animations

### Character Movement
- **Walk speed:** 48 px/sec (= 3 tiles/sec)
- **Walk animation:** 4 frames at 0.15s each
- **Type animation:** 2 frames at 0.3s each
- BFS pathfinding on the tile grid
- Characters lerp between tile centers

### Spawn/Despawn — Matrix Rain Effect ⭐
The killer visual effect: when agents spawn or despawn, there's a **Matrix-style digital rain** animation:
- **Duration:** 0.3 seconds
- Per-column sweep (16 columns for 16px-wide sprite)
- **Spawn:** green rain sweeps top→bottom, revealing character pixels underneath
- **Despawn:** green rain sweeps top→bottom, consuming character pixels
- Bright head pixel (`#ccffcc`), fading green trail behind
- Random column stagger (±0.3) for organic feel
- Hash-based flicker for shimmer (~70% visibility)
- Trail colors: bright green → medium green → dim green

### Wander Behavior (idle agents)
When not working, characters:
1. Sit at desk for 2-4 minutes
2. Stand up, wander 3-6 random tiles
3. Return to seat, rest 2-4 minutes
4. Repeat

### Seat Auto-Assignment
- Agent spawns → finds free desk → sits down
- If desk freed → next agent can claim it
- Click agent → click empty desk → reassign

### Furniture Auto-State
When agent is active at a desk → nearby electronics turn ON (monitors light up):
- Check 3 tiles deep in facing direction
- Check 2 tiles to each side
- Replace "off" sprite with "on" sprite variant

---

## UI Components

### Agent Labels (floating above characters)
```
[colored dot] — blue=active, yellow=waiting, none=idle
[name label] — "Agent #1" in pixel font
Background: rgba(30,30,46,0.7), padding 1-4px
Font: FS Pixel Sans (or Press Start 2P)
```

### Bottom Toolbar (floating, bottom-left)
```
[+ Agent] [Layout] [Settings]
Style: pixel-perfect, no border-radius, 2px solid borders
Background: var(--pixel-bg)
Shadow: 2px 2px 0px #0a0a14 (hard pixel shadow)
```

### Speech Bubbles
- **Permission bubble:** persistent, full opacity
- **Waiting bubble:** 2s duration, fades in last 0.5s
- Rendered above character head, follows sitting offset

---

## What We Adapt for AI Office

### Keep Same
- Canvas 2D engine (gameLoop + update + render)
- 16×16 tile grid
- Z-sorted rendering
- Character state machine (idle/walk/type)
- Matrix spawn/despawn effect
- Sprite data as 2D hex arrays
- Zoom + pan controls
- Agent labels floating above characters
- Pixel font (FS Pixel Sans or Press Start 2P)
- Hard pixel shadows, no border-radius on UI

### Change / Add
| Original (pixel-agents) | Our Version (AI Office) |
|-------------------------|-------------------------|
| VS Code extension panel | Full-screen web app |
| Claude Code terminals | Daytona sandbox + Vibe headless |
| No chat UI | Manager island (bottom bar with chat) |
| No task management | Kanban per agent (side panel) |
| No terminal streaming | Live terminal output on monitors |
| Blue accent (#5a8cff) | Mistral orange (#FF7000) |
| Generic office | Mistral-branded office (orange glow, Mistral logo) |
| No sound by default | Ambient office sounds + keyboard clicks |
| Max 64×64 grid | Fixed ~20×15 grid (no editor needed) |
| Layout editor | Not needed (fixed office layout) |
| 6 palettes, hue shift | Unique agent "skins" per role (coder=blue, researcher=green, etc.) |
| Read VS Code transcripts | Subscribe to Convex real-time data |

### Manager Island (new component, bottom of screen)
```
┌──────────────────────────────────────────────────────────────┐
│ 🤖 Manager                           Tasks: 3/5  🟢 Sandbox │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Assign a task to the office...                           │ │
│ └──────────────────────────────────────────────────────────┘ │
│ < Agent typing... >                                         │
└──────────────────────────────────────────────────────────────┘
```
Pixel art style, same dark bg, hard shadows, pixel font.

### Agent Side Panel (click an agent, slides from right)
```
┌──────────────────┐
│ Coder Agent #2   │
│ Status: Working  │
├──────────────────┤
│ [Kanban] [Term]  │
│ [Files] [Reason] │
├──────────────────┤
│ > npm install... │
│ > building...    │
│ > ✓ done         │
│ █                │
└──────────────────┘
```

---

## Sprite Reference (Key Dimensions)

| Sprite | Size (px) | Tiles |
|--------|-----------|-------|
| Character | 16×24 | 1×1.5 |
| Desk (square) | 32×32 | 2×2 |
| Chair | 16×16 | 1×1 |
| Bookshelf | 16×32 | 1×2 |
| Plant | 16×24 | 1×1.5 |
| PC/Monitor | 16×16 | 1×1 (on desk) |
| Water cooler | 16×24 | 1×1.5 |
| Whiteboard | 32×32 | 2×2 |

---

## Font

**Primary:** FS Pixel Sans (or Press Start 2P as fallback)
- Used for ALL text: labels, buttons, chat, terminal
- Sizes: 16px (sub-labels), 18px (labels), 22-24px (buttons)
- No anti-aliasing needed — pixel font is already crisp

---

## Implementation Notes

1. **Copy the engine pattern** — gameLoop.ts, renderer.ts, officeState.ts, characters.ts are the core
2. **Sprites as code** — no image files needed for basic furniture/characters, define as `string[][]`
3. **Later: sprite sheets** — for production quality, replace code sprites with tileset images
4. **Performance** — sprite caching at zoom level is critical, done via offscreen canvas
5. **Convex integration** — replace VS Code message events with Convex `useQuery` subscriptions
6. **The matrix effect is the wow factor** — prioritize implementing it, it looks incredible
