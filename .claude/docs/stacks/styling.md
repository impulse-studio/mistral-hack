# Styling System — shadcn/ui + Tailwind v4 + Design Tokens

<overview>

## Architecture

Three-layer token system:

1. **CSS custom properties** — raw design values (`--primary`, `--radius`)
2. **Semantic tokens** — shadcn's role-based tokens mapping to UI roles (`--primary`, `--accent`)
3. **Tailwind bridge** — `@theme inline` registers tokens as utility classes (`bg-primary`, `text-muted-foreground`)

All tokens use **OKLCH** color space (perceptually uniform, replaces HSL).

</overview>
<token-system>

## Token Layers

### Semantic Tokens (shadcn)

These are what shadcn components reference.

```css
:root {
  --primary: oklch(0.488 0.243 264);
  --primary-foreground: oklch(0.985 0 0);
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: var(--primary);
  --radius: 0.625rem;
  /* ... full list below ... */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... dark overrides ... */
}
```

### Tailwind Bridge

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
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
| `--destructive` / `--destructive-foreground` | Destructive/error actions |
| `--border` | Default border color |
| `--input` | Input field borders |
| `--ring` | Focus rings |
| `--chart-1` through `--chart-5` | Data visualization |
| `--sidebar` / `--sidebar-*` | Sidebar-specific variants |
| `--radius` | Base border radius (sm/md/lg/xl derived) |

</token-reference>
<globals-css>

## globals.css Structure

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

/* --- Semantic Tokens --- */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.488 0.243 264);
  --primary-foreground: oklch(0.985 0 0);
  /* ... all tokens ... */
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... dark overrides ... */
}

/* --- Tailwind Bridge --- */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  /* ... full mapping ... */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

</globals-css>
<gotchas>

## Gotchas

1. **"new-york" is the only style.** "default" is deprecated. Always use `"style": "new-york"` in `components.json`.
2. **OKLCH, not HSL.** Tailwind v4 + shadcn use `oklch()` values. Do not write `hsl()` tokens.
3. **`@theme inline`, not `tailwind.config`.** Tailwind v4 registers theme values via CSS `@theme inline` — no JS config file needed.
4. **`tw-animate-css`, not `tailwindcss-animate`.** The old animation package is deprecated.
5. **`--primary` is the background, `--primary-foreground` is the text.** The `-foreground` suffix means "text/icon color on that surface." `--primary` without suffix IS the background.
6. **Brand primitives must be full `oklch(...)` values.** Unlike the old HSL approach, don't separate channels. Write `oklch(0.488 0.243 264)` as a complete value.
7. **Dark mode uses `@custom-variant dark (&:is(.dark *));`** — not Tailwind's old `darkMode: 'class'` config.
8. **`radix-ui` is now a single package.** Replace individual `@radix-ui/react-*` imports with `radix-ui`.

</gotchas>
