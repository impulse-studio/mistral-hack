# Plan: Agent Git, Deploy & Role-based Daytona Tools

## Context

Agents currently only run Vibe headless (coder) or placeholder echo (general). We need to give them git access, Vercel deployment, and more Daytona tools — differentiated by role. The Daytona SDK v0.148.0 has full `sandbox.git.*` support and accepts `envVars` at creation time. A shared `GITHUB_TOKEN` PAT will be used for all agents. Vercel deploys should support creating new projects.

## Scope

- Git operations via Daytona SDK (`sandbox.git.*`)
- Env var injection into sandboxes at creation time
- Vercel deployment via CLI inside sandbox
- GitHub CLI for PRs/issues/comments
- Role-based capability matrix
- New manager tools for deploy + git + github

---

## Phase 1: Env Var Injection into Sandboxes

Sandboxes are currently created without env vars. We need to thread `envVars` through the creation pipeline.

### Files to modify

**`packages/backend/convex/sandbox/lifecycle.ts`**
- Add `envVars: v.optional(v.any())` arg to `createSandbox`
- Pass `envVars` to `daytona.create({ ..., envVars })`
- Add `envVars` arg to `ensureRunning`, forward to `createSandbox`

**`packages/backend/convex/agents/runner.ts`**
- Build env vars map based on agent role before calling `ensureRunning`:
  ```
  MISTRAL_API_KEY  → all agents
  GITHUB_TOKEN     → coder, general, researcher
  VERCEL_TOKEN     → coder, general
  ```
- Pass the map to `ensureRunning({ agentId, name, envVars })`

---

## Phase 2: Git Operations Module

New `sandbox/git.ts` — follows the same `internalAction` + `getRunning()` + `recordAndLog()` pattern as `sandbox/execute.ts` and `sandbox/computerUse.ts`.

### New file: `packages/backend/convex/sandbox/git.ts`

Wrap each Daytona SDK git method as an internalAction:

| Action | SDK method | Key args |
|--------|-----------|----------|
| `gitClone` | `sandbox.git.clone()` | url, path, branch?, uses GITHUB_TOKEN for auth (username=`x-access-token`, password=token) |
| `gitStatus` | `sandbox.git.status()` | path |
| `gitAdd` | `sandbox.git.add()` | path, files[] |
| `gitCommit` | `sandbox.git.commit()` | path, message, author, email |
| `gitPush` | `sandbox.git.push()` | path, uses GITHUB_TOKEN for auth |
| `gitPull` | `sandbox.git.pull()` | path, uses GITHUB_TOKEN for auth |
| `gitCreateBranch` | `sandbox.git.createBranch()` | path, name |
| `gitCheckoutBranch` | `sandbox.git.checkoutBranch()` | path, branch |
| `gitBranches` | `sandbox.git.branches()` | path |

Auth pattern: read `process.env.GITHUB_TOKEN` in the action handler, pass as `username="x-access-token"`, `password=token` to SDK methods that support it (clone, push, pull).

Each action logs via `recordAndLog()` for UI visibility.

---

## Phase 3: Vercel Deploy Module

New `sandbox/deploy.ts` — uses `runCommand` to run Vercel CLI inside the sandbox.

### New file: `packages/backend/convex/sandbox/deploy.ts`

| Action | What it does |
|--------|-------------|
| `installVercelCli` | `npm install -g vercel@latest` (idempotent, checks `which vercel` first) |
| `deployToVercel` | `vercel deploy [--prod] --yes --token=$VERCEL_TOKEN` — parses deployment URL from output |
| `linkVercelProject` | `vercel link --yes --token=$VERCEL_TOKEN [--scope] [--project]` |

The `VERCEL_TOKEN` env var is already in the sandbox env (injected in Phase 1). The CLI reads it automatically with `--token=$VERCEL_TOKEN`.

`deployToVercel` returns `{ success, output, deployUrl }` where `deployUrl` is extracted via regex from the CLI output.

---

## Phase 4: GitHub CLI Module

New `sandbox/github.ts` — uses `runCommand` to run `gh` CLI. The `gh` CLI reads `GITHUB_TOKEN` from env automatically.

### New file: `packages/backend/convex/sandbox/github.ts`

| Action | gh command |
|--------|-----------|
| `createPR` | `gh pr create --title ... --body ... [--base ...]` |
| `createIssue` | `gh issue create --title ... --body ... [--label ...]` |
| `addComment` | `gh issue comment <number> --body ...` |
| `ensureGhCli` | Install `gh` CLI if not present (one-liner binary download, not apt) |

Each action calls `ensureGhCli` first, then runs the `gh` command via `runCommand`. All args are shell-escaped using existing `escapeShellArg()` from `sandbox/shellUtils.ts`.

---

## Phase 5: Manager Tools for Git, Deploy, GitHub

Add new tools to the manager so it can orchestrate git/deploy/github operations.

### Files to modify

**`packages/backend/convex/manager/tools.ts`** — add action handlers:

| New action handler | Calls |
|---|---|
| `gitCloneAction` | `internal.sandbox.git.gitClone` |
| `gitPushAction` | `internal.sandbox.git.gitPush` |
| `deployProjectAction` | `internal.sandbox.deploy.deployToVercel` |
| `createPullRequestAction` | `internal.sandbox.github.createPR` |
| `createGitHubIssueAction` | `internal.sandbox.github.createIssue` |

**`packages/backend/convex/manager/handler.ts`** — register as `createActionTool`:

| Tool name | Description |
|-----------|------------|
| `gitClone` | Clone a repo into an agent's sandbox |
| `gitPush` | Push committed changes from an agent's sandbox |
| `deployProject` | Deploy a project from an agent's sandbox to Vercel |
| `createPullRequest` | Create a GitHub PR from an agent's sandbox repo |
| `createGitHubIssue` | Create a GitHub issue |

Update the manager system prompt to document new capabilities.

---

## Phase 6: Role-based Capability Matrix

Define which sandbox tools each role can access. This doesn't gate access at the action level (all are `internalAction`), but guides the runner and system prompts.

### New file: `packages/backend/convex/agents/shared/capabilities.ts`

```typescript
export type SandboxCapability = "shell" | "vibe" | "git" | "deploy" | "computerUse" | "github" | "filesystem";

export const roleCapabilities: Record<string, SandboxCapability[]> = {
  coder:      ["shell", "vibe", "git", "deploy", "github", "filesystem"],
  browser:    ["shell", "computerUse", "filesystem"],
  designer:   ["shell", "computerUse", "filesystem"],
  researcher: ["shell", "git", "filesystem"],
  copywriter: ["shell", "filesystem"],
  general:    ["shell", "git", "deploy", "github", "filesystem"],
};
```

### Integrate into runner: `packages/backend/convex/agents/runner.ts`

Use the capability matrix to determine which env vars to inject (Phase 1 integration — only inject `GITHUB_TOKEN` for roles with "git" capability, only inject `VERCEL_TOKEN` for roles with "deploy" capability).

### Integrate into coder runner: `packages/backend/convex/agents/coder/runner.ts`

Add optional pre-step: if task description contains a GitHub URL, clone the repo before running Vibe. Add optional post-step: git add + commit after Vibe generates code (only if working in a cloned repo context).

---

## Env Vars to Add (Convex Dashboard)

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | GitHub PAT (fine-grained, scopes: repo, issues, pull_requests) |
| `VERCEL_TOKEN` | Vercel personal access token |

---

## File Summary

### New files (4)
- `packages/backend/convex/sandbox/git.ts` — Daytona SDK git wrappers
- `packages/backend/convex/sandbox/deploy.ts` — Vercel CLI deploy actions
- `packages/backend/convex/sandbox/github.ts` — GitHub CLI wrappers
- `packages/backend/convex/agents/shared/capabilities.ts` — role capability matrix

### Modified files (4)
- `packages/backend/convex/sandbox/lifecycle.ts` — add envVars arg
- `packages/backend/convex/agents/runner.ts` — build + pass env vars by role
- `packages/backend/convex/manager/tools.ts` — add git/deploy/github action handlers
- `packages/backend/convex/manager/handler.ts` — register new tools + update system prompt

---

## Verification

1. `bun check-types` — must pass after all changes
2. `bun dev:server` — Convex functions deploy without errors
3. Manual test: ask manager to "clone repo X, make a change, create a PR"
4. Manual test: ask manager to "build a landing page and deploy it to Vercel"
5. Check agent logs in UI show git/deploy operations streaming in real-time
