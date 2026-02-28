# Claude Code Hooks Reference

<overview>

## What Are Hooks?

Shell scripts that run automatically at specific points in Claude Code's lifecycle. Unlike CLAUDE.md instructions (advisory), hooks are **deterministic** — they always execute.

Configure in `.claude/settings.json` (project-level) or `~/.claude/settings.json` (global).

</overview>
<events>

## Hook Events

| Event | When | Can Block? | Common Use |
|---|---|---|---|
| `SessionStart` | Session begins/resumes | No | Inject context, reminders |
| `UserPromptSubmit` | User submits prompt | Yes (exit 2) | Validate/transform prompts |
| `PreToolUse` | Before tool executes | Yes (exit 2/JSON) | Intercept commands, inject context |
| `PostToolUse` | After tool succeeds | No | Logging, notifications |
| `PostToolUseFailure` | After tool fails | No | Error tracking |
| `PermissionRequest` | Permission dialog shown | Yes (JSON) | Auto-allow/deny tools |
| `Stop` | Claude finishes responding | Yes | Force continuation |
| `SubagentStart` | Subagent spawned | No | Inject subagent context |
| `SubagentStop` | Subagent finishes | Yes | Validate subagent output |
| `Notification` | Notification sent | No | Forward to external services |
| `PreCompact` | Before context compaction | No | Preserve context |
| `SessionEnd` | Session ends | No | Cleanup |

</events>
<config-structure>

## Configuration Structure

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/my-hook.sh"
          }
        ]
      }
    ]
  }
}
```

### Matcher Values

- **Tool-specific**: `"Bash"`, `"Edit"`, `"Write"`, `"Read"`, `"Glob"`, `"Grep"`
- **Wildcard**: omit `matcher` to match all tools
- **Event-specific**: `"compact"` for SessionStart (fires on resume/compact), `"startup"` (first start only)

### Hook Types

| Type | Description |
|---|---|
| `command` | Shell script. Receives JSON on stdin, outputs JSON/text on stdout |
| `prompt` | Uses Haiku to make yes/no decisions based on a prompt |
| `agent` | Spawns a subagent with file access to verify conditions |

</config-structure>
<pretooluse>

## PreToolUse Hooks (Most Common)

### Input (JSON on stdin)

```json
{
  "session_id": "abc123",
  "cwd": "/path/to/project",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "bun dev",
    "description": "Start dev server",
    "timeout": 120000
  }
}
```

### Output Options

**Allow (default)** — exit 0, no output:
```bash
exit 0
```

**Block** — exit 2:
```bash
echo "Blocked: reason" >&2
exit 2
```

**Allow with injected context** — JSON on stdout:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "additionalContext": "Reminder: also check that docker is running"
  }
}
```

**Modify the command** — JSON with `updatedInput`:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {
      "command": "docker compose up -d && bun dev"
    }
  }
}
```

**Deny with reason**:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Must use bun, not npm"
  }
}
```

</pretooluse>
<patterns>

## Common Patterns

### Intercept a specific command

```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

if [[ "$COMMAND" == *"bun dev"* ]]; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      additionalContext: "Before starting dev, ensure infrastructure is running (docker compose, database, etc.)"
    }
  }'
else
  exit 0
fi
```

### Block npm in favor of bun

```bash
#!/bin/bash
COMMAND=$(cat | jq -r '.tool_input.command')

if [[ "$COMMAND" == npm* ]]; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Use bun instead of npm in this project"
    }
  }'
else
  exit 0
fi
```

### Inject reminders on session start

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Always run tests before committing. Use bun, not npm.'"
          }
        ]
      }
    ]
  }
}
```

### Auto-allow safe commands

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Is this a read-only or safe development command (ls, cat, git status, bun test, bun dev)? Answer yes to allow automatically."
          }
        ]
      }
    ]
  }
}
```

</patterns>
<gotchas>

## Gotchas

1. **stdin is JSON.** Always `cat` stdin and parse with `jq`. Don't assume positional args.
2. **Exit codes matter.** `0` = allow, `2` = block. Any other exit code = hook error (logged, tool proceeds).
3. **stdout is for Claude.** Use `>&2` for debug logging. Only structured JSON or plain text for context goes to stdout.
4. **`additionalContext` is advisory.** Claude sees it but may not always act on it. For guaranteed behavior, use `updatedInput` to modify the command directly.
5. **Hooks don't fire in headless mode** (`claude -p`) for `PermissionRequest`. Use `PreToolUse` instead.
6. **`PostToolUse` can't undo.** The tool already ran. Use `PreToolUse` to prevent.
7. **Scripts need `+x`.** `chmod +x .claude/hooks/my-hook.sh` or it won't execute.
8. **`$CLAUDE_PROJECT_DIR`** is available in hook commands — resolves to the project root.
9. **Async hooks** (`"async": true`) run in background without blocking Claude. Good for logging/notifications.

</gotchas>
