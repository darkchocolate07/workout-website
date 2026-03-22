#!/usr/bin/env bash
# Run API (port 8080) and Lyfta UI (port 21303) together. Vite proxies /api → 8080.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT=8080 pnpm --filter @workspace/api-server run dev &
API_PID=$!

cleanup() {
  if kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting API on :8080 (pid $API_PID)…"
sleep 3

echo "Starting Lyfta UI on :21303…"
export PORT=21303
export BASE_PATH=/
pnpm --filter @workspace/lyfta-exercises run dev
cleanup
