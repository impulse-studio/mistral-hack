# Pixel Kanban Design Sprint — Gamified Office Variant

## Goal
Create 10 standalone HTML design drafts for a **pixel-art gamified kanban task management UI** for the AI Office project. Inspired by the pixel-agents VSCode extension (github.com/pablodelucca/pixel-agents). Dark theme only. Mistral palette. Retro game aesthetic.

## Reference: pixel-agents
The pixel-agents project uses:
- 16x16 tile grid with Canvas 2D rendering
- Pixel-perfect sprites drawn at integer zoom (2x-4x)
- Top-down isometric-ish office with desks, chairs, plants, walls
- Characters that walk, sit, type at desks with speech bubbles
- HSL colorization for sprite recoloring
- Dark moody palette with colorful accents

## Design Philosophy — PIXEL GAME UI
This is NOT a standard web UI. This is a **game interface** that happens to manage tasks. Think:
- **Stardew Valley** inventory/quest UI
- **Habitica** gamified task system
- **Pokémon** menu screens
- **Final Fantasy** status screens
- **Undertale** dialog boxes

### Key Pixel UI Patterns
- **Pixel borders:** 2-4px solid borders that look like they're drawn on a grid
- **Pixel font:** "Press Start 2P" for headings, system monospace for body text
- **Chunky elements:** Large touch targets, exaggerated spacing, bold colors
- **Window chrome:** Title bars with [X] close buttons, pixel window borders
- **8-bit decorations:** Corner ornaments, divider dashes, arrow indicators
- **CRT/scanline effects:** Optional subtle scanline overlay for atmosphere
- **Sound effect hints:** Visual "click" indicators, bounce animations
- **XP/Level system:** Tasks give XP, agents level up, progress bars are chunky

## Palette — Mistral Pixel
- **Background:** `#0D0D11` (deep space), `#14141A` (surface), `#1C1C24` (elevated)
- **Border:** `#2E2E3A` (pixel border), `#3E3E4E` (hover border)
- **Text:** `#E8E8F0` (primary), `#9898A8` (secondary), `#5E5E6E` (muted)
- **Mistral Orange:** `#FF7000` (primary — XP bars, active states, primary actions)
- **Mistral Red:** `#FD3F29` (urgent, HP bars, destructive)
- **Mistral Yellow:** `#FFCB00` (highlight, gold/coins, review status)
- **Success Green:** `#22C55E` (done, complete, health)
- **Mana Blue:** `#3B82F6` (info, links, secondary accent)
- **Purple Magic:** `#A855F7` (special, rare labels, abilities)
- **Pixel White:** `#F0F0FF` (bright text, highlights)

## Typography
- **Headings:** "Press Start 2P" (Google Fonts pixel font)
- **Body/UI:** "Inter" at small sizes OR "JetBrains Mono" for data
- **Pixel sizes:** Use 8px, 10px, 12px, 16px, 20px (multiples of 2 for pixel grid alignment)

## Task Statuses — Gamified
- `backlog` — Gray scroll icon (Quest Log)
- `todo` — White sword icon (Ready to Fight)
- `in_progress` — Orange spinning gear/fire icon (In Battle)
- `review` — Yellow eye/magnifying glass (Inspection)
- `done` — Green star/trophy icon (Victory!)

## Priority Levels — RPG Style
- `urgent` — Red skull icon, pulsing glow (Boss Fight)
- `high` — Orange double-arrow-up (Elite Enemy)
- `medium` — Yellow single arrow (Standard Quest)
- `low` — Gray feather icon (Side Quest)
- `none` — Dashed line (Misc)

## Agent Representation
Each agent is a pixel character at a desk. When you view their tasks:
- Agent avatar (16x16 or 32x32 sprite) shown in header
- Agent "class" (Coder, Researcher, Designer, DevOps)
- Agent level + XP bar
- Speech bubble with current status

## Window System
All panels use a **pixel window** frame:
```
┌─[Title]──────────────[─][□][X]─┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░ Content area ░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└────────────────────────────────┘
```
- 3px pixel border (double-line effect with highlight + shadow colors)
- Title bar with pixel text, window controls
- Optional scrollbar: chunky 8px wide pixel scrollbar
- Inner content has 1px inset shadow line

## Agent Assignments

### Agent 1: Kanban Board — Full Gamified Layout
Full pixel-art kanban board styled as an **RPG quest board**:
- Board title: "⚔ QUEST BOARD" in Press Start 2P with pixel decorations
- 5 columns styled as quest categories with pixel headers and 8-bit icons
- Column headers: "📜 BACKLOG", "⚔ TODO", "🔥 IN PROGRESS", "👁 REVIEW", "⭐ DONE"
- Task cards as pixel "quest cards" with pixel borders, character avatars, XP rewards
- Column backgrounds with subtle pixel patterns (dots, crosses, diagonal lines)
- Bottom stats bar: "Total Quests: 21 | Active Agents: 4 | XP Today: +340"
- Pixel scrollbars, chunky "Add Quest" buttons with + icon
- Subtle scanline overlay effect (CSS repeating-linear-gradient)

### Agent 2: Task Card — All Pixel Variants
Quest card variants in pixel style:
- Default quest card: pixel border, title, agent sprite, priority skull/arrow, label pills
- Card with subtask progress: chunky HP-bar style (segmented, not smooth)
- Card with due date: hourglass icon, "3 DAYS LEFT" countdown style
- Card being dragged: pixel shadow offset (4px down-right), no smooth shadow
- Drop target: blinking dashed pixel border (CSS animation)
- Compact card: single-line quest entry like RPG menu item
- Card with attachment: pixel file/scroll icon preview
- BONUS: "Epic Quest" card variant with golden pixel border and sparkle animation

### Agent 3: Task Modal — Quest Detail Screen
Full quest detail modal styled as an **RPG item/quest inspection screen**:
- Pixel window frame with "QUEST DETAILS" title bar
- Quest title in Press Start 2P, quest ID as "#QST-247"
- Status as a pixel badge with icon
- Description in a scroll/parchment-style inner panel
- Right side: stats panel like RPG character sheet
  - Assigned Agent: sprite + name + class + level
  - Priority: icon + name
  - Labels: colored pixel pills
  - Due Date: hourglass + countdown
  - XP Reward: gold number with star icon
- Bottom: "ACTIVITY LOG" in a terminal/console style sub-panel
- Action buttons: pixel-style "COMPLETE QUEST" and "ABANDON" buttons

### Agent 4: Activity & Comments — Game Chat Log
Activity feed styled as a **game chat/event log**:
- Tab bar with pixel buttons: [CHAT] [LOG] [ALL] (Press Start 2P, 8px text)
- Chat messages with pixel speech bubbles (arrow pointing to avatar)
- Agent avatars as 16x16 pixel sprites next to messages
- Activity entries as system messages: "[SYSTEM] Agent-3 changed status to IN PROGRESS"
- Color-coded: green for creation, orange for status change, blue for assignment
- Timestamp in pixel monospace: "02:34 PM"
- Comment input: pixel text field with "TYPE MESSAGE..." placeholder
- Send button: chunky pixel arrow button
- Reactions as pixel emoji (8-bit style hearts, stars, thumbs up)

### Agent 5: Properties Panel — Character Stats Sheet
Properties sidebar styled as an **RPG character/item stat sheet**:
- Header: "QUEST STATS" with pixel decorations
- Each property as a stat row: "STR: ████░░ 67%"
- Status: pixel dropdown with colored dot indicators
- Agent: pixel sprite + name + class badge
- Priority: icon row (skull, arrows, feather) as selectable buttons
- Labels: pixel tag chips with X remove
- Due Date: calendar pixel icon + date
- XP Reward: star icon + number (editable)
- Subtasks as a checklist with pixel checkboxes (■ checked, □ unchecked)
- Progress bar: segmented HP-bar style
- Footer: pixel buttons "COPY LINK" and "DELETE" (red)

### Agent 6: Board Header — Game HUD
Top HUD bar for the quest board:
- Left: Pixel game logo/icon + "AI OFFICE" in Press Start 2P
- View toggles as pixel tab buttons: [BOARD] [LIST] [MAP] with active state
- Filter controls as pixel dropdown buttons
- Search: pixel input field with magnifying glass icon "SEARCH QUESTS..."
- Right side: Agent party display (row of pixel sprites with status dots)
- "NEW QUEST" button: large pixel button with + icon, orange glow
- Stats strip: "LVL 12 | XP: 2,340/3,000 | AGENTS: 4/8 | QUESTS: 21"
- XP progress bar: chunky segmented orange bar under the stats

### Agent 7: Badge & Icon System — Pixel Sprite Sheet
Comprehensive pixel design system reference:
- All 5 status icons drawn in pixel art (16x16 each)
- All 5 priority icons in pixel art
- Label chips in 8 colors with pixel borders
- Agent class badges: [CODER] [RESEARCHER] [DESIGNER] [DEVOPS] in pixel text
- Agent level badges: "LV.5" style
- XP number display styles
- Pixel avatar frames (selected, active, idle, offline)
- Due date pixel icons (hourglass variants)
- Achievement badges: "FIRST QUEST", "SPEED RUN", "10 STREAK"
- Notification pips (pixel dots: red, orange, green)
- Pixel arrows, chevrons, and UI navigation indicators

### Agent 8: Empty States & Loading — Game Screens
- Empty board: "NO QUESTS YET" with pixel campfire animation (CSS sprite) + "START FIRST QUEST" button
- Empty column: pixel tumbleweed or "..." dots animation
- Loading: pixel loading bar animation (segmented blocks filling left to right)
- Loading modal: "LOADING..." with pixel spinner (rotating square)
- Error state: pixel skull + "QUEST FAILED" + "RETRY" button with pixel sword icon
- No search results: pixel magnifying glass + "NOTHING FOUND" in Press Start 2P
- Onboarding: 3-panel pixel tutorial like game intro sequence with pixel arrow indicators
- Boot screen: "INITIALIZING QUEST BOARD..." with fake console log scrolling

### Agent 9: Drag & Drop — Pixel Interaction States
- Card picked up: pixel drop-shadow (hard 4px offset, no blur), scale 1.05
- Source gap: blinking pixel dashed outline (alternating pattern animation)
- Target indicator: bright orange pixel line (4px solid) between cards
- Cards spreading: CSS transform with pixel-snapped values (translate in 2px increments)
- Dropping into empty column: pixel sparkle burst animation
- Invalid drop: red pixel X flash, shake animation (2px left-right)
- Multi-select: stacked with pixel offset (2px each), count badge as pixel number
- BONUS: "Quest Accepted!" flash text animation when card drops successfully

### Agent 10: Context Menus & Command Palette — Game Menus
RPG-style menus:
- Context menu as a pixel window with menu items, arrow selector (▶ cursor), keyboard hints
- Quick actions: pixel icon buttons that pop up on hover (like game item shortcuts)
- Column menu: pixel dropdown with separator lines
- Bulk action bar: pixel toolbar with count badge, action pixel buttons
- Command palette: full-screen overlay styled as game command console
  - "COMMAND:" input with blinking pixel cursor
  - Results as selectable list with ▶ arrow indicator
  - Categories: [QUESTS] [AGENTS] [ACTIONS] with pixel tab buttons
- Keyboard reference: pixel window showing shortcut keys in Press Start 2P
- BONUS: "Are you sure?" confirmation dialog as pixel RPG dialog box with YES/NO

## Output Format
Each agent produces: `apps/experiments/2026-02-28-pixel-kanban/agent-{N}-{name}.html`
- Self-contained single HTML file
- Inline CSS (no external deps except Google Fonts for Press Start 2P + Inter)
- Pixel-perfect rendering: use `image-rendering: pixelated` where applicable
- CSS `box-shadow` for pixel borders: use hard shadows (0 offset, 0 blur) at 2-4px
- Animations should be stepped (not smooth) where possible for pixel feel
- `font-smooth: never` / `-webkit-font-smoothing: none` for pixel text
- Dark theme only
- 1440x900 viewport target
