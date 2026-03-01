# AI Office — Mistral Hackathon 2026

<overview>
Visual AI agent platform: Manager orchestrates sub-agents on a shared persistent Daytona sandbox.
Pixel-art office UI. Mistral-native. Full vision: `.claude/docs/vision.md`
</overview>

<structure>
apps/web/             — Vite + React 19 + TanStack Router, pixel-art canvas UI
packages/backend/     — Convex: schema, agents, auth, real-time state
packages/env/         — t3-env validation
packages/config/      — Shared TypeScript config
</structure>

<commands>
Dev (all):       `bun dev`
Dev (web):       `bun dev:web`
Dev (backend):   `bun dev:server`
Setup Convex:    `bun dev:setup`
Build:           `bun build`
Type-check:      `bun check-types`
</commands>

<key-entry-points>
Schema:    `packages/backend/convex/schema.ts`
Agents:    `packages/backend/convex/agent.ts`
Auth:      `packages/backend/convex/auth.config.ts`
Routes:    `apps/web/src/routes/`
</key-entry-points>

<todo>
## TODO Tracking
- The project TODO list lives at `TODO.md` (root)
- When completing work on any TODO item, update `TODO.md` to reflect the new status
- Mark items `[x]` when fully done, add `~Partial~` prefix for partial implementations
- Add a short italic note describing what was done
</todo>

<critical-constraints>
## ALWAYS
- Mistral models for all agent intelligence
- Mistral Vibe headless for coding sub-agents
- Real-time updates via Convex subscriptions
- bun (not npm/pnpm)

## NEVER
- Skip `bun check-types` before considering work done
- Hardcode API keys — use `@mistral-hack/env`
- Break monorepo workspace imports (`workspace:*`)
</critical-constraints>

<context-loading>
- Vision, architecture, agent design → `.claude/docs/vision.md`
- Stack reference docs → `.claude/docs/stacks/`
- Styling/UI rules → `.claude/rules/styling.md`, stack ref → `.claude/docs/stacks/styling.md`
</context-loading>
