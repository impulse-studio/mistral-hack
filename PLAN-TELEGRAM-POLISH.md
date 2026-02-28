# Plan: Telegram + Integration + Polish

> Owner: Léonard + DEV 2/3 collaboration
> Estimated: ~3-4h total

---

## Telegram (B18-B20) — ~1.5h

### Prerequisites
- `bun add grammy` in `packages/backend`
- Create Telegram bot via BotFather → get `BOT_TOKEN`
- Add `TELEGRAM_BOT_TOKEN` to Convex env vars
- Set webhook URL: `https://<convex-site-url>/telegram`

### B18 — Webhook Handler: `convex/telegram/webhook.ts`

```typescript
"use node";
import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";

export const webhook = httpAction(async (ctx, request) => {
  const body = await request.json();
  const message = body?.message;
  if (!message?.text) return new Response("OK");

  const chatId = message.chat.id;
  const text = message.text;

  // Save to messages table
  await ctx.runMutation(internal.messages.mutations.sendInternal, {
    content: text,
    role: "user",
    channel: "telegram",
    metadata: { telegramChatId: chatId },
  });

  // Forward to Manager thread
  // Use the durable agent API to send message to Manager
  // The Manager will process and respond
  // Response is sent back via B19

  return new Response("OK");
});
```

### B19 — Send Action: `convex/telegram/send.ts`

```typescript
"use node";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";

export const sendMessage = internalAction({
  args: {
    chatId: v.number(),
    text: v.string(),
  },
  handler: async (ctx, { chatId, text }) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  },
});
```

### B20 — HTTP Route: `convex/http.ts`

Add to existing http.ts:
```typescript
http.route({
  path: "/telegram",
  method: "POST",
  handler: telegram.webhook,
});
```

---

## Léonard's Remaining Tasks

### L1 — Env Vars (partial) | ~15min

Server-side env vars to add in Convex Dashboard:
- `MISTRAL_API_KEY` — for all Mistral model calls
- `DAYTONA_API_KEY` — for Daytona sandbox SDK
- `DAYTONA_TARGET` — Daytona target URL (if not default)
- `TELEGRAM_BOT_TOKEN` — for Telegram bot (Phase 4)

### L2 — Telegram Bot Setup | ~15min

1. Message @BotFather on Telegram
2. `/newbot` → name: "AI Office Manager"
3. Get the bot token
4. Set webhook: `curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<convex-site-url>/telegram"`

### L5 — Integration Testing | ~1h

Test the full flow end-to-end:
1. Send "Build a hello world React app" to Manager via web UI
2. Verify: Manager decomposes → spawns coder agent → agent appears on canvas
3. Verify: Sandbox creates/starts → Vibe headless runs → output streams to agentLogs
4. Verify: Task moves through kanban states → Manager reports result
5. Verify: Agent despawns → matrix rain effect → desk freed

### L7 — Demo Script | ~30min

Suggested demo flow for judges:
1. Open office (empty, dark, ambient particles)
2. Type: "Build me a portfolio website with dark theme"
3. Watch Manager think → decompose into tasks
4. See agents spawn (matrix rain!) → sit at desks → monitors light up
5. Click an agent → show terminal streaming, kanban
6. Send a Telegram message → see it arrive on the web UI
7. Agents finish → despawn → result delivered

### L10 — Deploy to Vercel | ~30min

- `bunx vercel` from `apps/web/`
- Configure build command: `bun run build`
- Set output directory
- Add env vars in Vercel dashboard
- Configure custom domain if available

---

## Dependency Graph

```
B7 (sandbox lifecycle)
  ↓
B8 (command execution) ← depends on B7
  ↓
B9 (vibe headless) ← depends on B8
  ↓
B12 (sub-agent runner) ← depends on B9 + B11(✅)
  ↓
B13 (onComplete) ← depends on B12
  ↓
F17 (useOfficeState) ← depends on B14(✅) + B15(✅)
  ↓
F10 (Manager Island) ← can start in parallel with B7
F14 (Agent Panel) ← can start in parallel with B7
  ↓
L5 (Integration testing) ← depends on everything above
  ↓
B18-B20 (Telegram) ← can start in parallel with F17
F22-F25 (Polish) ← can start in parallel with Telegram
```

## Parallel Work Streams

**Stream A (DEV 2 — Backend):** B7 → B8 → B9 → B12 → B13 → B17
**Stream B (DEV 3 — Frontend):** F10 → F14 → F15 → F16 → F17 → Office Route
**Stream C (Léonard):** L1 → L2 → L5 (integration testing when A+B converge) → L7 → L10

Stream A and B can run 100% in parallel. Stream C picks up integration when both converge.
