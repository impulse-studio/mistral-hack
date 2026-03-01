# Manual Agent Testing via Convex CLI

Quick reference for manually spawning agents, creating tasks, and triggering execution
via `npx convex run` without going through the UI or the manager.

## Prerequisites

- `bun dev:server` running (Convex dev server)
- Available desks in the office (agents need a free desk to spawn)

## 1. Spawn an Agent

```bash
npx convex run 'office/mutations:spawnAgent' '{
  "name": "TestBrowser",
  "type": "worker",
  "role": "browser",
  "model": "mistral-large-latest",
  "color": "#4a90d9"
}'
# Returns: agent ID like "j9746v6cwm..."
```

**Available roles:** `coder`, `researcher`, `copywriter`, `browser`, `designer`, `general`

## 2. Create a Task

```bash
npx convex run 'tasks/mutations:create' '{
  "title": "Search Google for hello kitty jacket",
  "description": "Open https://www.google.com, search for hello kitty jacket, report results.",
  "createdBy": "user"
}'
# Returns: task ID like "js79ttqvxv..."
```

## 3. Assign the Task

```bash
npx convex run 'tasks/mutations:assign' '{
  "taskId": "<TASK_ID>",
  "agentId": "<AGENT_ID>"
}'
```

## 4. Run the Agent

```bash
# This triggers the full pipeline: sandbox creation → role dispatch → execution
npx convex run 'debug:runSubAgent' '{
  "agentId": "<AGENT_ID>",
  "taskId": "<TASK_ID>"
}'
```

> **Note:** This is a long-running action (~1-2 min for browser agents). The Convex CLI
> may timeout with a Cloudflare 524 error — this is a CLI timeout, NOT a backend failure.
> The agent continues running on the backend. Check logs to monitor progress.

## 5. Monitor Logs

```bash
# Stream all logs for an agent
npx convex run 'logs/queries:streamForAgent' '{"agentId": "<AGENT_ID>"}'

# Check task status
npx convex run 'tasks/queries:get' '{"taskId": "<TASK_ID>"}'

# Check agent status
npx convex run 'office/queries:getAgent' '{"agentId": "<AGENT_ID>"}'
```

## 6. Debug Commands (per-agent sandbox)

```bash
# Run a shell command on an agent's sandbox
npx convex run 'debug:runCommandOnAgent' '{
  "agentId": "<AGENT_ID>",
  "command": "ls -la /home/user"
}'

# Start Computer Use (Xvfb + xfce4) for an agent
npx convex run 'debug:ensureAgentCU' '{"agentId": "<AGENT_ID>"}'

# Take a screenshot of an agent's desktop
npx convex run 'debug:takeAgentScreenshot' '{"agentId": "<AGENT_ID>"}'

# List windows on an agent's desktop
npx convex run 'debug:getAgentWindows' '{"agentId": "<AGENT_ID>"}'
```

## 7. Cleanup

```bash
# Despawn an agent (frees its desk)
npx convex run 'office/mutations:despawnAgent' '{"agentId": "<AGENT_ID>"}'

# Delete all Daytona sandboxes (free disk)
npx convex run 'debug:cleanupAllSandboxes' '{}'
```

## Quick One-Liner (spawn + task + assign + run)

```bash
AGENT=$(npx convex run 'office/mutations:spawnAgent' '{"name":"Test","type":"worker","role":"browser","model":"mistral-large-latest","color":"#4a90d9"}' 2>&1 | tr -d '"')
TASK=$(npx convex run 'tasks/mutations:create' '{"title":"Visit example.com","description":"Open https://example.com and describe the page.","createdBy":"user"}' 2>&1 | tr -d '"')
npx convex run 'tasks/mutations:assign' "{\"taskId\":\"$TASK\",\"agentId\":\"$AGENT\"}"
npx convex run 'debug:runSubAgent' "{\"agentId\":\"$AGENT\",\"taskId\":\"$TASK\"}"
```

## Known Issues

- **Daytona sandbox networking:** Outbound HTTPS may fail with `ERR_CONNECTION_RESET`
  or `ERR_QUIC_PROTOCOL_ERROR`. Chromium is launched with `--disable-quic` to mitigate
  the QUIC issue, but some sites may still be unreachable from the sandbox.
- **CLI timeout:** `npx convex run` times out after ~100s (Cloudflare 524). The agent
  keeps running on the backend — check logs for progress.
- **DISPLAY variable:** Browser sessions use `DISPLAY=:0` detected from the Xvfb process.
  If Computer Use restarts on a different display, the browser won't render.
