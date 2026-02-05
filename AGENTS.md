# AGENTS.md - Governance & Operational Protocols

**Phase 114: Rule Governance & Path Consolidation**

This document serves as the source of truth for all Agentic operations within this repository.

## 1. Directory Pathing Protocols
*   **Default Workspace**: `client-web`
*   **Execution Context**: All `npm`, `vite`, and build commands MUST be executed within the `client-web` directory unless explicitly instructed otherwise.
*   **Path Synchronization**: Agents must verify they are in the correct directory before running commands.

## 2. Branding Governance (Strict)
All visual elements must adhere to the following color palette. **NO GRADIENTS** allowed for brand colors.

*   **Primary Accent**: `#F9A825` (Solid Neutral Light Orange)
    *   Used for: Primary buttons, borders, active states, text highlights.
*   **Secondary/Brand Base**: `#1A1C2E` (Midnight Blue)
    *   Used for: Backgrounds (where applicable), Avatar fallbacks, Logo circles, Secondary text contrast.
*   **Backgrounds**: Pure White (`#FFFFFF`) for main application pages.

## 3. Change Control & Governance
*   **Scope Restriction**: Agents are authorized to modify files within `client-web` only.
*   **Override Protocol**: Modifying files in `admin-web`, `backend`, or root configuration requires explicit user authorization or a specific task mandate.
*   **Pre-Commit Check**: Verify no files outside `client-web` have been touched without valid reason.

## 4. Operational Mandates
*   **Network**: Use IP `192.168.7.49` for local development (as of Phase 114).
*   **Auth Domain Lock**: `https://auth.towme.net` is the ONLY authorized Supabase endpoint. Custom domain usage is MANDATORY to prevent 400 errors (Verified Phase 153/157).
*   **Remote Production Lock**: CLI deployments are DISABLED. All deployments must be triggered via GitHub Push to ensure `netlify.toml` environment injection (Phase 157).
*   **Production Handshake**: `auth.towme.net` is the only authorized origin. 400 errors are resolved via this lock (Phase 158).
*   **Route Integrity**: `VITE_SUPABASE_URL` must not include path suffixes. The client automatically appends `/auth/v1/`. Verified valid (Phase 159).
*   **Maintenance Mode**: 400 Errors Resolved. The Auth Handshake is 100% Verified. ALL future changes must follow the Remote Production Lock protocol (Phase 160).

## 5. TowMe v1.0 Production Readiness (Locked)
*   **Integrity Watch**: Any attempt to revert `VITE_SUPABASE_URL` to a `*.supabase.co` address will break authentication. This variable must remain `https://auth.towme.net` PERMANENTLY.
*   **Visual Consistency**: The Midnight Blue (`#1A1C2E`) background and Solid Neutral Light Orange (`#F9A825`) profile border are NON-NEGOTIABLE brand assets.

## 6. Maintenance & Regression Watch (Protocol 162)
*   **Passive Log Audit**: Monitor `client.towme.net` logs weekly for auth failures/400 codes.
*   **Domain Guard**: Immediate flag if Google Cloud Console "Authorized Origins" deviates from `auth.towme.net`.
*   **UI Verification**: Periodic audit of Avatar Border (1px `#F9A825`) and Branding Colors.
*   **Theme Strictness**: Any CSS/Theme PR deviating from `#F9A825` / `#1A1C2E` must be REJECTED.

## 7. Project ID Governance (Protocol 162)
*   **Production Project ID**: `auth.towme.net` (Mapped via Supabase).
*   **Sandbox Project ID**: Default Gemini Project (Dev/Test).
*   **Critical Mismatch Check**: Verify `VITE_GOOGLE_CLIENT_ID` in Netlify matches the intended project. (Note: Variable not currently in local `.env`, managed via Netlify UI).

## 8. Status
**ACTIVE & MONITORED**. Agents are in passive monitoring mode.
