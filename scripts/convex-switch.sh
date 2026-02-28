#!/usr/bin/env bash
# Switch between local and cloud Convex backends
# Usage: ./scripts/convex-switch.sh [local|cloud]

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

case "${1:-}" in
  local)
    cp "$ROOT/.env.cloud" "$ROOT/.env.cloud.bak" 2>/dev/null || true
    # Root env
    sed -i 's|CONVEX_DEPLOYMENT=dev:wry-gazelle-502|CONVEX_DEPLOYMENT=local:local-impulselab-mistral_hack|' "$ROOT/.env.local"
    sed -i 's|VITE_CONVEX_URL=https://wry-gazelle-502.eu-west-1.convex.cloud|VITE_CONVEX_URL=http://127.0.0.1:3210|' "$ROOT/.env.local"
    sed -i 's|VITE_CONVEX_SITE_URL=https://wry-gazelle-502.eu-west-1.convex.site|VITE_CONVEX_SITE_URL=http://127.0.0.1:3211|' "$ROOT/.env.local"
    # Backend env
    cp "$ROOT/packages/backend/.env.cloud" "$ROOT/packages/backend/.env.cloud.bak" 2>/dev/null || true
    cat > "$ROOT/packages/backend/.env.local" << 'EOF'
# Deployment used by `npx convex dev`
CONVEX_DEPLOYMENT=local:local-impulselab-mistral_hack # team: impulselab, project: mistral-hack

CONVEX_URL=http://127.0.0.1:3210

CONVEX_SITE_URL=http://127.0.0.1:3211
EOF
    echo "Switched to LOCAL Convex (http://127.0.0.1:3210)"
    echo "Run: cd packages/backend && bun convex dev"
    ;;
  cloud)
    # Root env
    sed -i 's|CONVEX_DEPLOYMENT=local:local-impulselab-mistral_hack|CONVEX_DEPLOYMENT=dev:wry-gazelle-502|' "$ROOT/.env.local"
    sed -i 's|VITE_CONVEX_URL=http://127.0.0.1:3210|VITE_CONVEX_URL=https://wry-gazelle-502.eu-west-1.convex.cloud|' "$ROOT/.env.local"
    sed -i 's|VITE_CONVEX_SITE_URL=http://127.0.0.1:3211|VITE_CONVEX_SITE_URL=https://wry-gazelle-502.eu-west-1.convex.site|' "$ROOT/.env.local"
    # Backend env
    cp "$ROOT/packages/backend/.env.cloud" "$ROOT/packages/backend/.env.local"
    echo "Switched to CLOUD Convex (wry-gazelle-502)"
    echo "Run: cd packages/backend && bun convex dev"
    ;;
  *)
    echo "Usage: $0 [local|cloud]"
    echo ""
    echo "Current config:"
    grep CONVEX_DEPLOYMENT "$ROOT/.env.local" || echo "  (not set in root .env.local)"
    grep CONVEX_DEPLOYMENT "$ROOT/packages/backend/.env.local" || echo "  (not set in backend .env.local)"
    exit 1
    ;;
esac
