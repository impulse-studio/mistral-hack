# Kanban Design Sprint — 10 Agent Parallel Design Drafts

## Goal
Create 10 standalone HTML design drafts for a **Linear-style kanban task management UI** for the AI Office project. Dark theme only. Mistral palette.

## Design System

### Palette
- **Background:** `#0A0A0B` (near-black), `#111113` (surface), `#1A1A1D` (elevated)
- **Border:** `#2A2A2E` (subtle), `#3A3A3E` (hover)
- **Text:** `#FAFAFA` (primary), `#A0A0A8` (secondary), `#6B6B73` (tertiary)
- **Mistral Orange:** `#FF7000` (primary accent)
- **Mistral Red:** `#FD3F29` (destructive/urgent)
- **Mistral Yellow:** `#FFCB00` (warning/highlight)
- **Success:** `#22C55E`
- **Info:** `#3B82F6`

### Typography
- **Font:** Inter (UI), mono for IDs/code
- **Sizes:** 11px labels, 13px body, 14px titles, 20px headings

### Task Statuses
- `backlog` — gray dot
- `todo` — white circle outline
- `in_progress` — orange half-filled circle (Mistral Orange)
- `review` — yellow circle (Mistral Yellow)
- `done` — green checkmark circle

### Priority Levels
- `urgent` — red (Mistral Red) filled icon
- `high` — orange (Mistral Orange) filled icon
- `medium` — yellow (Mistral Yellow) outline icon
- `low` — gray outline icon
- `none` — no icon

### Component Patterns
- 1px borders, not shadows for elevation
- 6px border-radius (cards), 4px (badges), 8px (modals)
- Subtle hover states (+5% lightness on surfaces)
- 150ms transitions

## Agent Assignments

### Agent 1: Kanban Board — Full Layout
Full-width kanban board with 5 columns (Backlog, Todo, In Progress, Review, Done).
Show column headers with task counts, scrollable card lists, column collapse controls.
3-5 realistic task cards per column. Bottom "add task" button per column.

### Agent 2: Task Card — All Variants
Design sheet showing task card variants:
- Default card with title, assignee avatar, priority, labels
- Card with subtask progress bar
- Card with due date (overdue, today, upcoming)
- Card being dragged (elevated, slight rotation, shadow)
- Card as drop target placeholder (dashed border)
- Compact card variant (just title + priority)
- Card with image/attachment preview

### Agent 3: Task Modal — Main View
Full task detail modal (centered, ~680px wide):
- Breadcrumb: Project > Status > Task ID
- Title (editable inline)
- Status selector dropdown
- Description (markdown-rendered block)
- Left side: main content area
- Right side: properties panel (assignee, priority, labels, due date, project)
- Bottom: activity feed toggle

### Agent 4: Task Modal — Activity & Comments
The activity/comments section of the task modal:
- Tab bar: Activity | Comments | All
- Comment input with markdown toolbar
- Comment thread with avatars, timestamps, edited indicator
- Activity entries: "X changed status from Todo to In Progress", "X assigned to Y"
- Reactions on comments
- "Load more" for long threads

### Agent 5: Task Modal — Properties & Metadata
Right-side properties panel in detail:
- Status dropdown (with colored dots)
- Assignee picker (avatar + name, multi-select)
- Priority selector (icon + label)
- Labels (colored chips, add new)
- Due date picker
- Project selector
- Parent task link
- Sub-tasks checklist with progress
- Created/Updated timestamps
- "Copy link" and "Delete task" footer actions

### Agent 6: Board Header & Toolbar
Top toolbar for the kanban board:
- Project title + icon
- View toggles: Board | List | Timeline (Board active)
- Filter bar: Status, Assignee, Priority, Label (chip-based active filters)
- Search input (cmd+K hint)
- Sort dropdown
- Group by dropdown
- "New Task" button (orange accent)
- Team member avatars row

### Agent 7: Status & Priority Badge System
Comprehensive badge/indicator design sheet:
- All 5 status badges with icons and colors
- All 5 priority levels with icons
- Label chips (8 colors: red, orange, yellow, green, blue, purple, pink, gray)
- Assignee avatars (single, stacked group, +N overflow)
- Due date badges (overdue=red, today=orange, this week=default, far=muted)
- Subtask progress indicators (fraction + mini progress bar)
- Task ID badges (#TSK-123 style)

### Agent 8: Empty States & Loading
- Empty board (no tasks yet) — illustration + CTA
- Empty column (no tasks in this status)
- Loading skeleton for board (shimmer cards)
- Loading skeleton for task modal
- Error state (failed to load)
- Search with no results
- First-time onboarding hint overlay

### Agent 9: Drag & Drop Interaction States
Show the kanban board during drag interactions:
- Card being picked up (scale up, shadow, slight tilt)
- Source column with gap where card was
- Target column with insertion indicator (orange line)
- Card hovering between two cards
- Card dropping into empty column
- Invalid drop zone (subtle red flash)
- Multi-select drag (stacked cards with count badge)

### Agent 10: Context Menus & Quick Actions
- Right-click context menu on task card (Change status, Set priority, Assign, Labels, Copy link, Delete)
- Quick action bar on card hover (status cycle, assign, priority)
- Column header context menu (Collapse, Sort, Filter, Hide, Delete)
- Keyboard shortcut hints in menus
- Bulk action toolbar (when multiple cards selected)
- Command palette (cmd+K) with task search

## Output Format
Each agent produces: `apps/experiments/2026-02-28-kanban-designs/agent-{N}-{name}.html`
- Self-contained single HTML file
- Inline CSS (no external deps except Google Fonts for Inter)
- Static mockup (no JS interactivity needed, but allowed for hover states)
- Dark theme only
- 1440x900 viewport target
- Use the aesthetic skill for design quality guidance
