# AI Office — TODO

> **Keep this file up to date.** When completing work on any item below, update its status immediately.

---

## Agent Observability

- [x] Click agent cards on manager kanban to see their session (running or done)
- [x] Log streaming when clicking on working agents to see what their computer looks like
- [ ] ~Partial~ Observability into computer use of workers — see their screen, where they click, how they navigate (read-only). _JPEG screenshots work; missing live VNC stream and click/navigation overlay annotations._
- [x] Expandable thoughts-type message + then a proper message

## Agent Capabilities

- [x] Improve code agent capabilities _(Mistral Vibe headless, auto-verify, auto-commit on feature branches)_
- [x] Give more Daytona tools to agents depending on agent type _(role-based capability tiers in `capabilities.ts`)_
- [x] Git operations — setup login to access git user credentials for agents _(full git toolkit, GitHub token injection)_
- [x] Comment on the repo _(createIssue, addComment, createPR via gh CLI)_
- [x] Improve system prompting _(role-based prompts, two-phase internal dialog, no-fabricated-links rule)_
- [x] Plan + execute mode _(researcher: plan/execute/synthesize, general: plan/retry/summary, browser: iterative vision loop)_
- [ ] ~Partial~ Full computer access, talking to the manager directly. _Computer use implemented but disabled on Daytona Tier 1/2 (no outbound internet). Manager communication works via mailbox._

## Task Management

- [x] Task board with dependencies
- [x] Dependency system
- [x] Per-worker kanban in sidebar
- [x] What the task is, task threads

## Agent Orchestration

- [x] Automatic agent orchestration system like OpenClaw _(manager decomposes, spawns, monitors, handles completion)_
- [ ] ~Partial~ Creates custom agents with defined skill + personality, can delegate skills/tasks. _6 pre-defined roles exist but no dynamic agent creation UI._
- [x] Tools: spawn, steer (message), stop agent
- [x] Worker complete sends messages to the main agent
- [x] Message queuing _(priority-based mailbox: critical/high/normal/background)_
- [ ] ~Partial~ Clock in / clock out with work duration. _`spawnedAt`/`completedAt` timestamps tracked, but no explicit clock-in/out UI._

## Multi-Project System

- [ ] Project system — different projects with:
  - Dedicated Daytona volume
  - Dedicated manager thread
  - Dedicated task kanban
  - Separate deliverables
- [ ] ~Partial~ Multiple chat threads, allow for multiple projects setup. _Multiple chat threads exist but not project-scoped._
- [ ] `+ Add Room`, reorder rooms, change floors as a funny thing

## Deployment

- [x] Deploy the project somewhere (maybe AWS) _(GitHub Actions → S3 bucket, auto-deploys on push to main)_
- [ ] Maybe Vercel deploy via API — making a deployed project
- [ ] Maybe deploy in an EC2 VPS

## User Interaction

- [x] User prompting _(chat UI at `/ai`, Telegram bot, structured Q&A system)_
- [x] Documents location — file icons on desk, documentation and plans there _(Document Hub at `/docs`)_

## UI / Fun

- [x] Mistral cat _(kitchen corner sprite)_
- [x] Speech bubbles _(permission + waiting bubbles above agent heads)_
- [ ] ~Partial~ Easter eggs. _Mistral cat is one, no others found._
- [ ] Linear integration — task management like Linear, link Linear, assign agents

## Queue & Notifications

- [x] Queue for messages _(full mailbox system with priority queue)_
- [x] Comment-to-task agent notification _(auto-notifies assigned agent or manager via mailbox)_
