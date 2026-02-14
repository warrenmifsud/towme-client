# Skill: TowMe Brand & Structural Integrity Enforcement

## Description
This is the immutable source of truth for the TowMe Client Application. Agents MUST read and adhere to these constraints before modifying any files.

## Mandatory Color Scheme (Never Change)
- **Primary Backgrounds**: Strictly **Pure White (#FFFFFF)**.
- **Primary Accents**: Strictly **Solid Neutral Light Orange (#F9A825)** (used for all buttons, price text, active icons, and input borders).
- **Brand Secondary**: **Midnight Blue (#1A1C2E)** (used ONLY for the circular logo background and high-level navigation text).
- **Prohibited**: No gradients, no shadows, no blurs, no legacy greys/blues.

## Structural Requirements
- **Mobile First**: All layouts must be centered for mobile viewports using Flexbox/Grid (`min-h-screen`, `items-center`).
- **Logo**: The TowMe logo must always be a perfect circle with a Midnight Blue (#1A1C2E) background.
- **Sticky Footer**: The 'Confirm Service Request' button must be restored and locked to the bottom of the Service Selection panel.
- **Avatar**: Always fetch and display the Google Avatar if available in the user metadata.

## Execution Guardrail
- **Audit Mode**: Before applying any UI changes, search for legacy color hex codes and replace them with the TowMe palette.
- **Logic Isolation**: Never modify Supabase client configuration or authentication logic.

## Emergency Procedures
- **Restoration Procedure**: If the UI structure collapses or branding deviates from #F9A825 and #FFFFFF, the agent must execute: `git reset --hard 59cc446`
- **Check-In Rule**: Instruct the agent to perform a layout verification after every 5 file modifications.
- **Validation Failure Loop**: If a screenshot artifact fails the visual check, the agent must revert to commit 59cc446 and regenerate its implementation plan.
