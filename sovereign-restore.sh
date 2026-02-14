#!/bin/bash
# ╔════════════════════════════════════════════════════════════════╗
# ║  SOVEREIGN RESTORE SCRIPT — Project Lockdown LKS-01          ║
# ║  Tag: v1.0.0-SOVEREIGN-BASE                                   ║
# ║  Date: 2026-02-14                                              ║
# ║  Powered by W.M Coding                                        ║
# ╚════════════════════════════════════════════════════════════════╝
#
# EMERGENCY ONLY — Restores the project to the verified sovereign state.
# This script is the "Red Button" to return all portals to their
# 2026-02-14 working state.
#
# Usage: ./sovereign-restore.sh [--full | --code-only | --functions-only]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_REF="letjcjqppyxzqfthdqul"
TAG="v1.0.0-SOVEREIGN-BASE"

RED='\033[0;31m'
GREEN='\033[0;32m'
GOLD='\033[0;33m'
NC='\033[0m'

echo -e "${GOLD}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GOLD}║  SOVEREIGN RESTORE — LKS-01                   ║${NC}"
echo -e "${GOLD}║  Restoring to: ${TAG}           ║${NC}"
echo -e "${GOLD}╚════════════════════════════════════════════════╝${NC}"

MODE="${1:---full}"

# ─────────────────────────────────────────────────
# STEP 1: CODE RESTORATION
# ─────────────────────────────────────────────────
restore_code() {
    echo -e "\n${GOLD}[1/3] CODE RESTORATION${NC}"
    
    # Safety: Check for uncommitted changes
    if ! git diff --quiet HEAD 2>/dev/null; then
        echo -e "${RED}WARNING: Uncommitted changes detected.${NC}"
        read -p "Stash changes and continue? (y/N): " confirm
        if [[ "$confirm" != "y" ]]; then
            echo "Aborted."
            exit 1
        fi
        git stash push -m "pre-restore-$(date +%Y%m%d_%H%M%S)"
    fi
    
    git checkout "$TAG"
    echo -e "${GREEN}✓ Code restored to ${TAG}${NC}"
    echo -e "  Commit: $(git rev-parse --short HEAD)"
}

# ─────────────────────────────────────────────────
# STEP 2: EDGE FUNCTION DEPLOYMENT
# ─────────────────────────────────────────────────
deploy_functions() {
    echo -e "\n${GOLD}[2/3] EDGE FUNCTION DEPLOYMENT${NC}"
    
    cd "$SCRIPT_DIR/backend"
    
    # Deploy approve-driver WITHOUT JWT verification (Deploy #26 config)
    echo "  Deploying approve-driver (--no-verify-jwt)..."
    npx supabase functions deploy approve-driver \
        --no-verify-jwt \
        --project-ref "$PROJECT_REF"
    echo -e "${GREEN}✓ approve-driver deployed (--no-verify-jwt)${NC}"
    
    # Deploy send-email (standard)
    echo "  Deploying send-email..."
    npx supabase functions deploy send-email \
        --project-ref "$PROJECT_REF"
    echo -e "${GREEN}✓ send-email deployed${NC}"
    
    # Deploy driver-status (standard)
    echo "  Deploying driver-status..."
    npx supabase functions deploy driver-status \
        --project-ref "$PROJECT_REF"
    echo -e "${GREEN}✓ driver-status deployed${NC}"
    
    # Deploy terminate-driver (standard)
    echo "  Deploying terminate-driver..."
    npx supabase functions deploy terminate-driver \
        --project-ref "$PROJECT_REF"
    echo -e "${GREEN}✓ terminate-driver deployed${NC}"
    
    cd "$SCRIPT_DIR"
}

# ─────────────────────────────────────────────────
# STEP 3: INSTALL DEPENDENCIES
# ─────────────────────────────────────────────────
install_deps() {
    echo -e "\n${GOLD}[3/3] DEPENDENCY INSTALLATION${NC}"
    
    for portal in admin-web driver-web client-web; do
        if [ -d "$SCRIPT_DIR/$portal" ]; then
            echo "  Installing $portal..."
            cd "$SCRIPT_DIR/$portal"
            npm install --legacy-peer-deps 2>/dev/null || npm install
            echo -e "${GREEN}✓ $portal dependencies installed${NC}"
        fi
    done
    cd "$SCRIPT_DIR"
}

# ─────────────────────────────────────────────────
# EXECUTION
# ─────────────────────────────────────────────────
case "$MODE" in
    --full)
        restore_code
        deploy_functions
        install_deps
        ;;
    --code-only)
        restore_code
        install_deps
        ;;
    --functions-only)
        deploy_functions
        ;;
    *)
        echo "Usage: $0 [--full | --code-only | --functions-only]"
        exit 1
        ;;
esac

echo -e "\n${GOLD}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GOLD}║  SOVEREIGN RESTORE COMPLETE                    ║${NC}"
echo -e "${GOLD}║                                                ║${NC}"
echo -e "${GOLD}║  Start portals:                                ║${NC}"
echo -e "${GOLD}║    Admin:  cd admin-web  && npm run dev         ║${NC}"
echo -e "${GOLD}║    Driver: cd driver-web && npm run dev         ║${NC}"
echo -e "${GOLD}║    Client: cd client-web && npm run dev         ║${NC}"
echo -e "${GOLD}║                                                ║${NC}"
echo -e "${GOLD}║  Edge Function Config (Deploy #26):            ║${NC}"
echo -e "${GOLD}║    approve-driver: --no-verify-jwt              ║${NC}"
echo -e "${GOLD}║    send-email:     standard                     ║${NC}"
echo -e "${GOLD}║    driver-status:  standard                     ║${NC}"
echo -e "${GOLD}║    terminate-driver: standard                   ║${NC}"
echo -e "${GOLD}╚════════════════════════════════════════════════╝${NC}"
echo -e "${GREEN}Powered by W.M Coding${NC}"
