#!/bin/bash
# ╔════════════════════════════════════════════════════════════════╗
# ║  SOVEREIGN SYNC — Antigravity Pulse Sentinel                  ║
# ║  Auto-stages, commits, and pushes on a 4-hour heartbeat       ║
# ║  Powered by W.M Coding                                        ║
# ╚════════════════════════════════════════════════════════════════╝

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BRANCH="dev-branding-updates"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"
SHORT_TS="$(date '+%Y%m%d-%H%M')"

GOLD='\033[0;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GOLD}[SYNC ${TIMESTAMP}]${NC} $1"; }

# ─────────────────────────────────────────────────
# GUARD: Only sync if there are actual changes
# ─────────────────────────────────────────────────
if git diff --quiet HEAD 2>/dev/null && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    log "No changes detected. Vault is current."
    exit 0
fi

# ─────────────────────────────────────────────────
# GUARD: Ensure we're on the correct branch
# ─────────────────────────────────────────────────
CURRENT_BRANCH="$(git branch --show-current)"
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    log "${RED}WARNING: On branch '$CURRENT_BRANCH', expected '$BRANCH'. Skipping sync.${NC}"
    exit 1
fi

# ─────────────────────────────────────────────────
# STAGE & COMMIT
# ─────────────────────────────────────────────────
CHANGED_COUNT="$(git status --short | wc -l | tr -d ' ')"
log "Staging ${CHANGED_COUNT} changes..."

git add -A

# Build commit message from changed directories
AREAS=$(git diff --cached --name-only | sed 's|/.*||' | sort -u | tr '\n' ', ' | sed 's/,$//')

git commit -m "SYNC [${SHORT_TS}]: Auto-vault — ${AREAS}

Files: ${CHANGED_COUNT} | Branch: ${BRANCH}
Timestamp: ${TIMESTAMP}
Powered by W.M Coding" --quiet

log "${GREEN}✓ Committed ${CHANGED_COUNT} files (${AREAS})${NC}"

# ─────────────────────────────────────────────────
# PUSH
# ─────────────────────────────────────────────────
log "Pushing to origin/${BRANCH}..."
git push origin "$BRANCH" --quiet 2>&1

log "${GREEN}✓ Vault synced to GitHub${NC}"
echo -e "${GOLD}Powered by W.M Coding${NC}"
