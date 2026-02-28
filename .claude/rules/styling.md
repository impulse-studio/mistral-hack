---
paths:
  - "**/*.tsx"
  - "**/*.css"
---

# Styling — Pixel-Art Token System

Read `.claude/docs/stacks/styling.md` BEFORE editing styles.

## Hard Rules

- **OKLCH only** — never `hsl()` or `rgb()` for tokens
- **`border-2`** — never `border` (1px too thin for pixel art)
- **`shadow-pixel inset-shadow-pixel`** on cards/containers — compose outer + inset
- **`font-mono uppercase tracking-widest`** for labels/metadata
- **Zero radius** — all `rounded-*` produce 0px; never override with arbitrary values
- **Hover = lift** — `hover:-translate-x-px hover:-translate-y-px hover:shadow-pixel-hover`
- **Active = press** — `active:translate-x-px active:translate-y-px active:inset-shadow-pressed`
- **`bg-brand-accent`** for themed accent — not hardcoded `bg-orange-500` (unless intentional)
