---
paths:
  - "apps/web/src/**/*.tsx"
---

# Web Component File Naming

## Hard Rules

- **All `.tsx` files MUST use PascalCase** — Enforced by `mistral-hack/tsx-pascal-case` oxlint rule. `SignInForm.component.tsx`, `Button.tsx`, `Card.stories.tsx`.
- **Feature components MUST use `.component.tsx` extension** — Any component that represents a distinct UI feature or is imported by routes. Named `PascalCase.component.tsx`.
- **shadcn/ui primitives stay plain `.tsx`** — Components in `components/ui/` (Button, Card, Input, etc.) keep their default shadcn naming. These are generic building blocks, not features.
- **Internal sub-components use plain `.tsx`** — Components only used as building blocks inside a single parent component. Never imported directly by routes or other features.
- **Routes are excluded** — Files in `routes/` follow TanStack Router conventions (`__root.tsx`, `dashboard.tsx`, etc.), not this rule.
- **Stories co-locate with their component** — `Button.stories.tsx` next to `Button.tsx`, `SignInForm.component.tsx` → `SignInForm.stories.tsx`.

## File structure

```
src/
  components/
    ui/
      Button.tsx                    ← shadcn primitive (plain .tsx)
      Button.stories.tsx
      Card.tsx                      ← shadcn primitive
      Input.tsx                     ← shadcn primitive
    SignInForm.component.tsx         ← feature component (imported by routes)
    SignUpForm.component.tsx         ← feature component
    UserMenu.component.tsx          ← feature component
    Header.component.tsx            ← feature component
    Loader.tsx                      ← internal utility (not a feature)
  routes/
    __root.tsx                      ← TanStack Router (excluded from rule)
    dashboard.tsx
```

## When features grow

When a feature has multiple sub-components, group them in a folder:

```
src/
  components/
    office/
      OfficeCanvas.component.tsx     ← public feature component
      OfficeAgentSprite.tsx           ← internal (only used by OfficeCanvas)
      OfficeToolbar.component.tsx     ← public feature component
```

## Why

The `.component.tsx` suffix distinguishes feature-level components (the things routes import and compose) from primitives and internal helpers. PascalCase matches React component naming conventions and is enforced by oxlint.
