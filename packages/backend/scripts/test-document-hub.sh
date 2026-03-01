#!/usr/bin/env bash
# Test Document Hub: Agent A writes a document, Agent B reads it and appends a line.
#
# Prerequisites: bun dev:server running
# Usage: bash packages/backend/scripts/test-document-hub.sh

set -euo pipefail
cd "$(dirname "$0")/.."

C='\033[0;36m'  # cyan
G='\033[0;32m'  # green
R='\033[0;31m'  # red
N='\033[0m'     # reset

log()  { echo -e "${C}[test]${N} $*"; }
pass() { echo -e "${G}[PASS]${N} $*"; }
fail() { echo -e "${R}[FAIL]${N} $*"; exit 1; }

# Helper: run convex command silently, return just the value
cx() { npx convex run "$@" 2>/dev/null; }

# ──────────────────────────────────────────────────────────
log "Phase 1: Agent A writes a document to the Doc Hub"
# ──────────────────────────────────────────────────────────

# Spawn agent A — a copywriter
log "Spawning Agent A (copywriter)..."
AGENT_A=$(cx 'office/mutations:spawnAgent' '{
  "name": "DocWriter",
  "type": "worker",
  "role": "copywriter",
  "model": "mistral-small-latest",
  "color": "#3B82F6"
}' | tr -d '"')
log "Agent A: $AGENT_A"

# Create a task for Agent A: write a research document
log "Creating write task..."
TASK_A=$(cx 'tasks/mutations:create' '{
  "title": "Write research notes on Document Hub architecture",
  "description": "Write a short research note (3-5 paragraphs) about the benefits of a shared document hub for AI agent teams. Save it to /home/company/outputs/. The content should discuss knowledge persistence, cross-agent context sharing, and searchability.",
  "createdBy": "user"
}' | tr -d '"')
log "Task A: $TASK_A"

# Assign + run
log "Assigning and running Agent A..."
cx 'tasks/mutations:assign' "{\"taskId\":\"$TASK_A\",\"agentId\":\"$AGENT_A\"}" > /dev/null

# Run with timeout — this is a long-running action
log "Running Agent A (this takes ~1-2 min)..."
timeout 300 npx convex run 'debug:runSubAgent' "{\"agentId\":\"$AGENT_A\",\"taskId\":\"$TASK_A\"}" 2>/dev/null || true

# Check task status
log "Checking Task A result..."
TASK_A_STATUS=$(cx 'tasks/queries:get' "{\"taskId\":\"$TASK_A\"}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'] if d else 'null')")
log "Task A status: $TASK_A_STATUS"

if [ "$TASK_A_STATUS" = "done" ]; then
  pass "Agent A completed the writing task"
else
  log "Task A status is '$TASK_A_STATUS' — checking if doc was still created..."
fi

# ──────────────────────────────────────────────────────────
log "Phase 2: Verify document appeared in the Doc Hub"
# ──────────────────────────────────────────────────────────

sleep 2  # let the onComplete mutation propagate

DOCS=$(cx 'debug:listDocuments' '{}')
DOC_COUNT=$(echo "$DOCS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
log "Documents in hub: $DOC_COUNT"

if [ "$DOC_COUNT" -gt 0 ]; then
  pass "Document Hub has documents"
  # Get the first (most recent) document ID
  DOC_ID=$(echo "$DOCS" | python3 -c "import sys,json; docs=json.load(sys.stdin); print(docs[0]['_id'])")
  DOC_TITLE=$(echo "$DOCS" | python3 -c "import sys,json; docs=json.load(sys.stdin); print(docs[0]['title'])")
  log "Latest doc: '$DOC_TITLE' ($DOC_ID)"
else
  fail "No documents found in the hub after Agent A completed"
fi

# ──────────────────────────────────────────────────────────
log "Phase 3: Agent B reads the document and adds a line"
# ──────────────────────────────────────────────────────────

# Spawn agent B — a general worker
log "Spawning Agent B (general)..."
AGENT_B=$(cx 'office/mutations:spawnAgent' '{
  "name": "DocReader",
  "type": "worker",
  "role": "general",
  "model": "mistral-small-latest",
  "color": "#F59E0B"
}' | tr -d '"')
log "Agent B: $AGENT_B"

# Create a task for Agent B: read from doc hub + append
log "Creating read+append task..."
TASK_B=$(cx 'tasks/mutations:create' "{
  \"title\": \"Read and update the research notes document\",
  \"description\": \"First, list the files in /home/company/outputs/ to find any research notes. Read the file. Then append a new paragraph at the end summarizing: 'Addendum by DocReader: The Document Hub also enables audit trails and version tracking of agent knowledge over time.' Save the updated file back.\",
  \"createdBy\": \"user\"
}" | tr -d '"')
log "Task B: $TASK_B"

# Assign + run
log "Assigning and running Agent B..."
cx 'tasks/mutations:assign' "{\"taskId\":\"$TASK_B\",\"agentId\":\"$AGENT_B\"}" > /dev/null

log "Running Agent B (this takes ~1-2 min)..."
timeout 300 npx convex run 'debug:runSubAgent' "{\"agentId\":\"$AGENT_B\",\"taskId\":\"$TASK_B\"}" 2>/dev/null || true

# Check task status
TASK_B_STATUS=$(cx 'tasks/queries:get' "{\"taskId\":\"$TASK_B\"}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'] if d else 'null')")
log "Task B status: $TASK_B_STATUS"

if [ "$TASK_B_STATUS" = "done" ]; then
  pass "Agent B completed the read+append task"
else
  log "Task B status: $TASK_B_STATUS (may still have produced a document)"
fi

# ──────────────────────────────────────────────────────────
log "Phase 4: Final verification"
# ──────────────────────────────────────────────────────────

sleep 2

FINAL_DOCS=$(cx 'debug:listDocuments' '{}')
FINAL_COUNT=$(echo "$FINAL_DOCS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
log "Final document count: $FINAL_COUNT"

if [ "$FINAL_COUNT" -ge 2 ]; then
  pass "Both agent results are in the Document Hub ($FINAL_COUNT documents)"
else
  log "Expected 2+ documents, got $FINAL_COUNT"
fi

# Print all document titles
echo ""
log "=== Documents in Hub ==="
echo "$FINAL_DOCS" | python3 -c "
import sys, json
docs = json.load(sys.stdin)
for d in docs:
    tags = ', '.join(d.get('tags', []))
    snippet = (d.get('content') or '')[:100].replace('\n', ' ')
    print(f\"  [{d['type']}] {d['title']}\")
    print(f\"    tags: {tags}\")
    print(f\"    snippet: {snippet}...\")
    print()
"

# ──────────────────────────────────────────────────────────
log "Phase 5: Cleanup"
# ──────────────────────────────────────────────────────────

log "Despawning agents..."
cx 'office/mutations:despawnAgent' "{\"agentId\":\"$AGENT_A\"}" > /dev/null 2>&1 || true
cx 'office/mutations:despawnAgent' "{\"agentId\":\"$AGENT_B\"}" > /dev/null 2>&1 || true

echo ""
log "=== Test complete ==="
