# Styling System — Pixel-Art + shadcn/ui + Tailwind v4

<overview>

## Architecture

Three-layer token system with a pixel-art aesthetic:

1. **Brand primitives** — tunable accent color (`--brand-accent: oklch(0.705 0.213 47)` — Mistral orange)
2. **Semantic tokens** — shadcn's role-based tokens mapping to UI roles (`--primary`, `--accent`, etc.)
3. **Tailwind bridge** — `@theme inline` registers tokens as utility classes (`bg-primary`, `shadow-pixel`, etc.)

All color tokens use **OKLCH** color space. All corners use **0px radius** (pixel-art = no rounding).

</overview>
<pixel-art>

## Pixel-Art Style Primitives

### Shadows — the core pixel effect

Hard-offset, zero-blur shadows create the retro depth. Registered as Tailwind utilities via `@theme inline`.

**Outer shadows** (drop shadow behind element):

| Utility | Value | Use |
|---|---|---|
| `shadow-pixel` | `2px 2px 0 rgba(0,0,0,0.4)` | Default card/container |
| `shadow-pixel-hover` | `3px 3px 0 rgba(0,0,0,0.5)` | Hover lift |
| `shadow-pixel-lg` | `4px 4px 0 rgba(0,0,0,0.4)` | Large containers, board-level |

**Inset shadows** (bevels, highlights, pressed states):

| Utility | Value | Use |
|---|---|---|
| `inset-shadow-pixel` | `1px 1px 0 rgba(240,240,255,0.04)` | Subtle top-left highlight |
| `inset-shadow-pixel-hover` | `1px 1px 0 rgba(240,240,255,0.06)` | Brighter highlight on hover |
| `inset-shadow-bevel` | `-2px -2px 0 rgba(0,0,0,0.25), 2px 2px 0 rgba(255,255,255,0.15)` | Button bevel (3D raised effect) |
| `inset-shadow-bevel-hover` | `-2px -2px 0 rgba(0,0,0,0.25), 2px 2px 0 rgba(255,255,255,0.2)` | Button bevel on hover |
| `inset-shadow-pressed` | `2px 2px 0 rgba(0,0,0,0.25)` | Active/pressed state |

**Composition** — outer + inset combine automatically:

```html
<!-- Card: highlight + drop shadow -->
<div class="shadow-pixel inset-shadow-pixel">

<!-- Hover: bigger shadow + brighter highlight + lift -->
<div class="hover:shadow-pixel-hover hover:inset-shadow-pixel-hover hover:-translate-x-px hover:-translate-y-px">

<!-- Button: bevel + drop shadow -->
<button class="shadow-pixel inset-shadow-bevel">

<!-- Pressed: squish down, inset only -->
<button class="active:shadow-none active:inset-shadow-pressed active:translate-x-px active:translate-y-px">
```

### Borders

Always `border-2` (thick, crisp). Never `border` (1px is too thin for pixel art).

```html
<div class="border-2 border-border">       <!-- Standard container -->
<div class="border-2 border-orange-700">   <!-- Accent button border -->
<div class="border-2 border-dashed">       <!-- Empty/placeholder -->
```

### Border Radius

All radius tokens are `0px`. Every `rounded-*` utility produces square corners. This is intentional — pixel art has no curves.

### Typography

- **Labels/metadata:** `font-mono text-[10px] uppercase tracking-widest font-semibold`
- **IDs/codes:** `font-mono text-[11px] font-medium text-muted-foreground`
- **Body text:** `text-xs font-medium leading-relaxed text-foreground`
- **Headings:** `font-mono font-semibold uppercase tracking-widest text-sm`

### Hover/Active Interaction Pattern

```html
<!-- Lift on hover (card/button) -->
hover:-translate-x-px hover:-translate-y-px

<!-- Press on active (button) -->
active:translate-x-px active:translate-y-px
```

### Brand Accent (Mistral Orange)

Available as `bg-brand-accent`, `text-brand-accent`, `border-brand-accent` via the Tailwind bridge.

Use orange-500/orange-700 from Tailwind's built-in palette for buttons and interactive elements. The `--brand-accent` token is for theming — changing it recolors the dark mode accent, ring, and sidebar.

</pixel-art>
<token-system>

## Token Layers

### Layer 1: Brand Primitives

Single tunable accent. Defined in `:root`, drives dark mode accent tinting.

```css
:root {
  --brand-accent: oklch(0.705 0.213 47);   /* Mistral orange */
  --radius: 0px;                           /* Pixel art = square */
}
```

### Layer 2: Semantic Tokens (shadcn)

Map to UI roles. These are what shadcn components reference.

```css
:root {
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --accent: oklch(0.97 0 0);
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0px;
  /* ... full list in index.css ... */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --accent: oklch(0.269 0.03 47);            /* Subtle orange tint */
  --accent-foreground: oklch(0.705 0.213 47); /* Brand orange */
  --ring: oklch(0.705 0.213 47);             /* Focus ring = brand */
  /* ... dark overrides ... */
}
```

### Layer 3: Tailwind Bridge

```css
@theme inline {
  /* Colors */
  --color-background: var(--background);
  --color-primary: var(--primary);
  --color-brand-accent: var(--brand-accent);
  /* ... full mapping ... */

  /* Pixel shadows */
  --shadow-pixel: 2px 2px 0 rgba(0,0,0,0.4);
  --inset-shadow-pixel: 1px 1px 0 rgba(240,240,255,0.04);
  --inset-shadow-bevel: -2px -2px 0 rgba(0,0,0,0.25), 2px 2px 0 rgba(255,255,255,0.15);
  /* ... full list ... */

  /* Radius — all zero */
  --radius-sm: 0px;
  --radius-md: 0px;
  --radius-lg: 0px;
  --radius-xl: 0px;
}
```

</token-system>
<token-reference>

## Complete Semantic Token List

### Naming Convention

`--primary` IS the background color. `--primary-foreground` is text placed on it. This applies to every pair.

| Token | Purpose |
|---|---|
| `--background` / `--foreground` | Page/app background and default text |
| `--card` / `--card-foreground` | Card surfaces |
| `--popover` / `--popover-foreground` | Popover/dropdown surfaces |
| `--primary` / `--primary-foreground` | Primary actions (buttons, links) |
| `--secondary` / `--secondary-foreground` | Secondary actions |
| `--muted` / `--muted-foreground` | Muted/disabled elements |
| `--accent` / `--accent-foreground` | Accent/highlight surfaces |
| `--destructive` | Destructive/error actions |
| `--border` | Default border color |
| `--input` | Input field borders |
| `--ring` | Focus rings |
| `--chart-1` through `--chart-5` | Data visualization |
| `--sidebar` / `--sidebar-*` | Sidebar-specific variants |
| `--brand-accent` | Tunable brand color (Mistral orange) |
| `--radius` | Base border radius (always 0 for pixel art) |

</token-reference>
<gotchas>

## Gotchas

1. **"new-york" is the only style.** "default" is deprecated. Always use `"style": "new-york"` in `components.json`.
2. **OKLCH, not HSL.** Tailwind v4 + shadcn use `oklch()` values. Do not write `hsl()` tokens.
3. **`@theme inline`, not `tailwind.config`.** Tailwind v4 registers theme values via CSS `@theme inline` — no JS config file needed.
4. **`tw-animate-css`, not `tailwindcss-animate`.** The old animation package is deprecated.
5. **`--primary` is the background, `--primary-foreground` is the text.** The `-foreground` suffix means "text/icon color on that surface."
6. **All radius tokens are 0px.** Pixel art = no rounded corners. Every `rounded-*` utility produces square corners.
7. **Use `border-2`, never `border`.** 1px borders are too thin for the pixel-art aesthetic.
8. **Compose shadows with outer + inset.** `shadow-pixel inset-shadow-pixel` combines automatically. Never use only one in isolation on cards.
9. **Dark mode uses `@custom-variant dark (&:is(.dark *));`** — not Tailwind's old `darkMode: 'class'` config.
10. **`radix-ui` is now a single package.** Replace individual `@radix-ui/react-*` imports with `radix-ui`.

</gotchas>
