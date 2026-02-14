#!/bin/bash
# ╔════════════════════════════════════════════════════════════════╗
# ║  SOVEREIGN SYNC — Antigravity Pulse Sentinel                  ║
# ║  Auto-stages, commits, pushes, and NOTIFIES on heartbeat      ║
# ║  Powered by W.M Coding                                        ║
# ╚════════════════════════════════════════════════════════════════╝

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BRANCH="dev-branding-updates"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"
SHORT_TS="$(date '+%Y%m%d-%H%M')"
SUPABASE_URL="https://letjcjqppyxzqfthdqul.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldGpjanFwcHl4enFmdGhkcXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjY5MTcsImV4cCI6MjA4NTI0MjkxN30.CZp5flGIrof23lDLyMfF3dymcbHGPIwAzHVWaziOdMg"

GOLD='\033[0;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GOLD}[SYNC ${TIMESTAMP}]${NC} $1"; }

# ── NOTIFICATION FUNCTION ────────────────────────
notify() {
    local status="$1"
    local files="${2:-0}"
    local areas="${3:-N/A}"
    local commit="${4:-N/A}"
    local error_msg="${5:-}"

    curl -s -X POST "${SUPABASE_URL}/functions/v1/notify-sentinel" \
        -H "Content-Type: application/json" \
        -H "apikey: ${ANON_KEY}" \
        -H "Authorization: Bearer ${ANON_KEY}" \
        -d "{
            \"status\": \"${status}\",
            \"files_changed\": \"${files}\",
            \"areas\": \"${areas}\",
            \"branch\": \"${BRANCH}\",
            \"commit_hash\": \"${commit}\",
            \"timestamp\": \"${TIMESTAMP}\",
            \"error_message\": \"${error_msg}\"
        }" > /dev/null 2>&1 || true

    log "Notification dispatched: ${status}"
}

# ── GUARD: Only sync if there are actual changes ─
if git diff --quiet HEAD 2>/dev/null && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    log "No changes detected. Vault is current."
    exit 0
fi

# ── GUARD: Ensure correct branch ─────────────────
CURRENT_BRANCH="$(git branch --show-current)"
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    log "${RED}WARNING: On branch '$CURRENT_BRANCH', expected '$BRANCH'. Skipping.${NC}"
    notify "FAILED" "0" "N/A" "N/A" "Wrong branch: ${CURRENT_BRANCH}"
    exit 1
fi

# ── STAGE & COMMIT ───────────────────────────────
CHANGED_COUNT="$(git status --short | wc -l | tr -d ' ')"
log "Staging ${CHANGED_COUNT} changes..."

git add -A

AREAS=$(git diff --cached --name-only | sed 's|/.*||' | sort -u | tr '\n' ', ' | sed 's/,$//')

git commit -m "SYNC [${SHORT_TS}]: Auto-vault — ${AREAS}

Files: ${CHANGED_COUNT} | Branch: ${BRANCH}
Timestamp: ${TIMESTAMP}
Powered by W.M Coding" --quiet

COMMIT_HASH="$(git rev-parse --short HEAD)"
log "${GREEN}✓ Committed ${CHANGED_COUNT} files (${AREAS}) — ${COMMIT_HASH}${NC}"

# ── PUSH ─────────────────────────────────────────
log "Pushing to origin/${BRANCH}..."
if git push origin "$BRANCH" --quiet 2>&1; then
    log "${GREEN}✓ Vault synced to GitHub${NC}"
    notify "SUCCESS" "${CHANGED_COUNT}" "${AREAS}" "${COMMIT_HASH}"
else
    log "${RED}✗ Push failed${NC}"
    notify "FAILED" "${CHANGED_COUNT}" "${AREAS}" "${COMMIT_HASH}" "git push failed"
    exit 1
fi

echo -e "${GOLD}Powered by W.M Coding${NC}"
