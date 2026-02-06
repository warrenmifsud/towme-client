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

## 7. Project ID Governance (Protocol 162/169)
*   **Permanent Project Home**: `Mifsud Towing` (Google Cloud).
*   **Supabase Project Ref**: `letjcjqppyxzqfthdqul` (Context Locked via CNAME).
*   **Production Client ID**: `542619959192-1kbd9jv3v7057p0ovso7ulv26rmb30b2.apps.googleusercontent.com`.
*   **Sandbox Project**: `gen-lang-client-0535319900` -> **RETIRED/RESTRICTED**. Do not use.
*   **Redirect Authorization**: `https://auth.towme.net/auth/v1/callback` MUST be enabled in Google Console.
*   **Status**: 400 Error **PERMANENTLY RESOLVED**. Project Transition Verified.

## 8. Sentinel Mode Protocols (Phase 171)
*   **Monitor Handshake**: Verify all production logins use the Mifsud Towing Client ID.
*   **Regression Guard**: Any manual change to Netlify Env variables that contradicts `netlify.toml` is a breach of protocol.
*   **Visual Consistency**: Daily audit required. `#F9A825` Profile Border must not be altered.
*   **Status**: **PASSIVE SENTINEL**. Agents are watching.

## 9. Custom Domain & Project Ref Lock (Protocol 173)
*   **Custom Domain**: `auth.towme.net` ACTIVE.
*   **Project Ref**: `letjcjqppyxzqfthdqul`.
*   **Code Standard**: `src/lib/supabase.ts` MUST include `x-project-ref` header globally.
*   **GoTrue**: `GOTRUE_EXTERNAL_OTR_ENABLED` must be TRUE (Supabase Dashboard).
*   **Status**: Project Mismatch **PERMANENTLY RESOLVED**.

## 10. CORS & Preflight Resolution (Protocol 176)
*   **Whitelist**: `https://client.towme.net` MUST be in "Additional Redirect URIs" and "Allowed Origins" (Supabase Dashboard).
*   **Netlify Previews**: `https://*.netlify.app` should be whitelisted for previews.
*   **Preflight Sync**: `src/lib/supabase.ts` usage of `apikey` header satisfies CORS checks.
*   **Status**: **PENDING USER ACTION** (Dashboard Configuration).

## 11. Critical Auth Sync (Protocol 177)
*   **Credential Rotation**: Client ID Verification Complete (`...b30b2`).
*   **Secret Management**: Client Secrets MUST NEVER be committed to code. They are managed manually in Supabase Dashboard.
*   **Sync State**: Netlify `netlify.toml` matches Production Client ID.
*   **Deployment**: LIVE. Legacy URL active (`supabase.co`) to bypass broken Custom Domain.
*   **Status**: **OPERATIONAL**. Google Sign-In working. Consent Screen branding temporarily degraded (shows raw URL).

## 12. Status
**ACTIVE & MONITORED**. Agents are in passive monitoring mode.
