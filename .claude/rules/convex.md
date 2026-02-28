---
paths:
  - "packages/backend/convex/**/*.ts"
  - "packages/backend/convex/**/*.tsx"
---

# Convex Backend

BEFORE editing Convex functions, schema, or backend logic, you MUST:

1. Read `.claude/docs/stacks/convex.md` for the full Convex guidelines (function syntax, validators, queries, mutations, actions, scheduling, file storage)
2. Use Context7 (`resolve-library-id` then `query-docs`) to look up any Convex API you are unsure about

## Critical Rules

- ALWAYS use the new function syntax (`query({args, handler})`) — never bare exports
- ALWAYS include argument validators for every function
- NEVER use `filter` — define an index and use `withIndex`
- NEVER use `ctx.db` inside an action — actions don't have DB access
- NEVER put `"use node";` in files that export queries or mutations
- Use `internal` for private functions, `api` for public ones — both from `_generated/api`
- All function calls (`ctx.runQuery`, `ctx.runMutation`, `ctx.runAction`) take a `FunctionReference`, not the function itself
- Include all index fields in the index name (e.g. `by_field1_and_field2`)
