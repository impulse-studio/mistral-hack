# Test Prompts — Sandbox Per Agent

Progressive test scenarios for verifying per-agent sandbox isolation with shared volume.

## 1. Single Agent — Basic File Creation

> Create a task for a coder agent: "Write a hello.txt file with the text 'Hello from Agent A'"

**Expected:** One sandbox created, file written at `/home/user/hello.txt`.

## 2. Single Coder — Vibe Generates + Executes Code

> Create a coder task: "Write a TypeScript function that computes Fibonacci numbers and prints fib(10)"

**Expected:** Vibe headless runs inside the agent's sandbox, code executes, output shows `55`.

## 3. Two Agents — Verify Isolation (Separate Sandboxes)

> Create two tasks simultaneously:
> - Coder A: "Create a file /home/user/agent-a.txt with 'I am Agent A'"
> - Coder B: "Create a file /home/user/agent-b.txt with 'I am Agent B'"

**Expected:** Two separate sandboxes created (visible in test page). Each agent only sees its own `/home/user/` files.

## 4. Two Agents — Verify Shared Volume

> Create two tasks:
> - Agent A: "Write a file /home/company/shared-data.txt with 'Shared data from A'"
> - Agent B (after A completes): "Read the file /home/company/shared-data.txt and print its contents"

**Expected:** Agent B reads the file written by Agent A via the shared Daytona volume mounted at `/home/company`.

## 5. Multi-Agent Project — Full Delegation Flow

> "Build a simple REST API: have a coder write the server code, and a researcher document the API endpoints"

**Expected:**
- Manager decomposes into 2+ sub-tasks
- Each sub-agent gets its own sandbox
- Test page shows multiple sandbox indicators with agent names
- On completion, sandboxes are stopped (not deleted)
- Shared volume at `/home/company` allows file sharing between agents
