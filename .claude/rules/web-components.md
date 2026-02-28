---
paths:
  - "apps/web/src/**/*.tsx"
---

# Web Component File Naming

## Hard Rules

- **Feature components MUST use `.component.tsx` extension** — Any component that represents a distinct UI feature or is imported by routes. Named `kebab-case.component.tsx`.
- **shadcn/ui primitives stay plain `.tsx`** — Components in `components/ui/` (Button, Card, Input, etc.) keep their default shadcn naming. These are generic building blocks, not features.
- **Internal sub-components use plain `.tsx`** — Components only used as building blocks inside a single parent component. Never imported directly by routes or other features.
- **Routes are excluded** — Files in `routes/` follow TanStack Router conventions (`__root.tsx`, `dashboard.tsx`, etc.), not this rule.
- **Stories co-locate with their component** — `button.stories.tsx` next to `button.tsx`, `sign-in-form.component.tsx` → `sign-in-form.stories.tsx`.

## File structure

```
src/
  components/
    ui/
      button.tsx                  ← shadcn primitive (plain .tsx)
      button.stories.tsx
      card.tsx                    ← shadcn primitive
      input.tsx                   ← shadcn primitive
    sign-in-form.component.tsx    ← feature component (imported by routes)
    sign-up-form.component.tsx    ← feature component
    user-menu.component.tsx       ← feature component
    header.component.tsx          ← feature component
    loader.tsx                    ← internal utility (not a feature)
  routes/
    __root.tsx                    ← TanStack Router (excluded from rule)
    dashboard.tsx
```

## When features grow

When a feature has multiple sub-components, group them in a folder:

```
src/
  components/
    office/
      office-canvas.component.tsx    ← public feature component
      office-agent-sprite.tsx         ← internal (only used by office-canvas)
      office-toolbar.component.tsx    ← public feature component
```

## Why

The `.component.tsx` suffix distinguishes feature-level components (the things routes import and compose) from primitives and internal helpers. It prevents accidental coupling to internals and makes the public surface obvious at a glance.
