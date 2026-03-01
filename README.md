# AI Office

**Watch your AI agents work.** A visual orchestration platform where a Manager agent decomposes tasks, spawns specialized workers at virtual desks, and streams their progress in real-time — all inside a pixel-art office you can explore and interact with.

Built for the [Mistral AI Worldwide Hackathon 2026](https://worldwide-hackathon.mistral.ai/) (Paris edition, Feb 28 – Mar 1).

## The Problem

AI agents today work in a black box. You send a prompt, wait, and hope for the best. You can't see what's happening, redirect mid-task, or understand why something failed.

## Our Solution

AI Office makes agent work **visible and manageable**. A persistent pixel-art office serves as the control center:

- **Manager Agent** receives your task (via web chat or Telegram), breaks it into sub-tasks with dependencies, and spawns the right specialist
- **Sub-agents** (coder, researcher, copywriter, browser, designer) sit at desks with glowing monitors — click any agent to inspect their terminal output, reasoning, task board, screenshots, and deliverables in real-time
- **Shared Sandbox** — all agents operate on a persistent [Daytona](https://www.daytona.io/) computer with a shared filesystem, git, and deployment tools
- **Kanban Board** tracks every task through backlog → in progress → review → done, with dependency chains and threaded comments
- **Document Hub** — a shared knowledge base agents and users both contribute to

## Key Features

| Feature | Details |
|---------|---------|
| Agent Orchestration | Manager decomposes → spawns → monitors → handles completion. Priority-based mailbox system |
| Real-time Streaming | Terminal output, screenshots, and reasoning streamed via Convex WebSockets |
| Role-based Agents | 6 specialist types with different tool access (Vibe coding, git, deploy, web, computer use) |
| Smart Sandbox | Auto-wake on task, auto-sleep after 15 min idle. Persistent volume across sessions |
| Pixel-art Canvas | 60fps tile-based renderer with animated sprites, glowing monitors, and interactive furniture |
| Gamification | Arcade corner (Snake, Tetris, Pong), office cat, interactive bookshelves, agent status glow effects |
| Telegram Bot | Message the Manager from Telegram, get results back |
| Voice I/O | Speech-to-text input + ElevenLabs voice synthesis |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TanStack Start, Vite, HTML5 Canvas |
| Backend | [Convex](https://convex.dev/) (real-time database + serverless functions) |
| AI Models | Mistral Large (manager), Codestral (coders), Mistral Small (workers), Ministral 8B (routing) |
| Coding Agent | [Mistral Vibe](https://docs.mistral.ai/capabilities/vibe/) headless CLI |
| Sandbox | [Daytona](https://www.daytona.io/) persistent cloud computer |
| Agent Framework | `@convex-dev/agent` + `convex-durable-agents` + `@convex-dev/workpool` |
| Auth | Better Auth (OAuth + email) |
| Styling | Tailwind CSS + shadcn/ui + custom pixel-art components |
| Deployment | GitHub Actions → AWS S3 (auto-deploy on push to main), Storybook on GitHub Pages |
| Monorepo | Turborepo + bun workspaces |

## Project Structure

```
apps/web/                  React frontend — canvas, chat, kanban, docs
packages/backend/convex/   Convex backend — agents, tasks, sandbox, schema
packages/env/              Environment variable validation (t3-env)
packages/config/           Shared TypeScript config
```

## Getting Started

```bash
# Install dependencies
bun install

# Set up Convex backend
bun dev:setup

# Start everything
bun dev
```

Required environment variables are validated via `@mistral-hack/env` — see `packages/env/` for the full list.

## Architecture

```
User (Web / Telegram)
  │
  ▼
Manager Agent (mistral-large)
  │  Decomposes task, creates sub-tasks with dependencies
  ▼
┌─────────┬──────────┬───────────┬─────────┬──────────┐
│ Coder   │Researcher│Copywriter │ Browser │ Designer │
│codestral│  small   │   small   │  small  │  small   │
└────┬────┴────┬─────┴─────┬─────┴────┬────┴────┬─────┘
     │         │           │          │         │
     ▼         ▼           ▼          ▼         ▼
   Daytona Persistent Sandbox (/home/company/)
   ├── Shell execution    ├── Git operations
   ├── Mistral Vibe CLI   ├── GitHub API
   ├── File I/O           ├── Web scraping
   └── Deployment         └── Computer use
```

All agent activity streams back to the office canvas in real-time via Convex subscriptions.

## Team

Built by:
- **Aykut Akgun** — Discord: Autumnlight02
- **Leonard Roussard** — Discord: Lionvsx
- **Matteo Marchelli** — Discord: .unknown78

## License

[MIT](LICENSE)
