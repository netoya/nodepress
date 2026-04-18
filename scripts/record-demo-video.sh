#!/usr/bin/env bash
# record-demo-video.sh — One-shot script to record the NodePress 30-04 demo video.
#
# What it does:
#   1. Checks that Docker + Postgres are up (required for DB ops)
#   2. Resets and seeds the database (5 posts + admin user)
#   3. Starts the backend in demo mode (NODEPRESS_DEMO_MODE=true) in background
#   4. Starts the admin dev server in demo mode in background
#   5. Waits for both services to be ready (HTTP poll)
#   6. Runs Playwright with the demo config (records video + trace)
#   7. Kills background processes
#   8. Reports the video output path
#
# Usage:
#   ./scripts/record-demo-video.sh
#
# Prerequisites:
#   - Docker running with Postgres (docker-compose up -d)
#   - DATABASE_URL set in environment or .env
#   - Node 22+, npm 10+

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
BACKEND_PORT=3000
ADMIN_PORT=5173
BACKEND_PID=""
ADMIN_PID=""
POLL_INTERVAL=2
POLL_TIMEOUT=60

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[demo]${NC} $*"; }
warn() { echo -e "${YELLOW}[demo]${NC} $*"; }
err()  { echo -e "${RED}[demo]${NC} $*" >&2; }

# ── Cleanup trap ──────────────────────────────────────────────────────────────
cleanup() {
  log "Cleaning up background processes..."
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    log "Backend stopped (pid $BACKEND_PID)"
  fi
  if [[ -n "$ADMIN_PID" ]] && kill -0 "$ADMIN_PID" 2>/dev/null; then
    kill "$ADMIN_PID" 2>/dev/null || true
    log "Admin stopped (pid $ADMIN_PID)"
  fi
}
trap cleanup EXIT INT TERM

# ── 1. Check Docker / Postgres ────────────────────────────────────────────────
log "Step 1: Checking Docker..."
if ! command -v docker &>/dev/null; then
  err "Docker not found. Install Docker and retry."
  exit 1
fi
if ! docker info &>/dev/null; then
  err "Docker daemon is not running. Start Docker Desktop and retry."
  exit 1
fi
if ! docker ps --filter "name=nodepress-postgres" --format '{{.Status}}' 2>/dev/null | grep -q "Up"; then
  err "Postgres container (nodepress-postgres) is not running."
  err "Run:  docker compose up -d"
  err "Then retry this script."
  exit 1
fi
log "Docker OK"

# ── 2. Reset DB + seed ────────────────────────────────────────────────────────
log "Step 2: Resetting database (truncate + re-seed)..."
cd "$REPO_ROOT"
if ! npm run demo:reset 2>&1; then
  warn "demo:reset exited non-zero — falling back to db:seed."
  if ! npm run db:seed 2>&1; then
    warn "db:seed also failed — continuing (seeds may already be applied)."
  fi
fi
log "Database reset complete"

# ── 3. Start backend in demo mode ─────────────────────────────────────────────
log "Step 3: Starting backend (NODEPRESS_DEMO_MODE=true) on port $BACKEND_PORT..."
NODEPRESS_DEMO_MODE=true npm run dev > /tmp/nodepress-backend.log 2>&1 &
BACKEND_PID=$!
log "Backend started (pid $BACKEND_PID)"

# ── 4. Start admin dev server ─────────────────────────────────────────────────
log "Step 4: Starting admin (VITE_USE_MSW=false) on port $ADMIN_PORT..."
cd "$REPO_ROOT/admin"
VITE_USE_MSW=false VITE_API_URL="http://localhost:$BACKEND_PORT" npm run dev > /tmp/nodepress-admin.log 2>&1 &
ADMIN_PID=$!
log "Admin started (pid $ADMIN_PID)"

# ── 5. Wait for services to be ready ─────────────────────────────────────────
poll_until_up() {
  local name="$1"
  local url="$2"
  local elapsed=0
  log "Waiting for $name at $url..."
  until curl -sf "$url" -o /dev/null 2>/dev/null; do
    if [[ $elapsed -ge $POLL_TIMEOUT ]]; then
      err "$name did not come up within ${POLL_TIMEOUT}s."
      err "Check logs: /tmp/nodepress-backend.log and /tmp/nodepress-admin.log"
      exit 1
    fi
    sleep "$POLL_INTERVAL"
    elapsed=$((elapsed + POLL_INTERVAL))
  done
  log "$name is up"
}

poll_until_up "Backend" "http://localhost:$BACKEND_PORT/wp/v2/posts"
poll_until_up "Admin" "http://localhost:$ADMIN_PORT"

# ── 6. Run Playwright demo config ─────────────────────────────────────────────
log "Step 6: Running Playwright demo recording..."
cd "$REPO_ROOT/admin"
npx playwright test --config=playwright.demo.config.ts
PLAYWRIGHT_EXIT=$?

# ── 7. Processes cleaned up by trap ──────────────────────────────────────────

# ── 8. Report video output ────────────────────────────────────────────────────
if [[ $PLAYWRIGHT_EXIT -eq 0 ]]; then
  VIDEO_PATH=$(find "$REPO_ROOT/admin/test-results" -name "*.webm" -newer "$REPO_ROOT/admin/playwright.demo.config.ts" 2>/dev/null | head -1)
  log "---"
  log "Demo recording complete."
  if [[ -n "$VIDEO_PATH" ]]; then
    VIDEO_SIZE=$(du -sh "$VIDEO_PATH" 2>/dev/null | cut -f1)
    log "Video: $VIDEO_PATH ($VIDEO_SIZE)"
  else
    warn "Video file not found in test-results/ — check Playwright output above."
  fi
  log "HTML trace: $REPO_ROOT/admin/playwright-report-demo/index.html"
  log "---"
else
  err "Playwright exited with code $PLAYWRIGHT_EXIT."
  err "Check logs above and /tmp/nodepress-backend.log for details."
  exit $PLAYWRIGHT_EXIT
fi
