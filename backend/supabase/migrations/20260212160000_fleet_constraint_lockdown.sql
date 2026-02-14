-- ═══════════════════════════════════════════════════════════
-- SOVEREIGN COMMAND PACKET: THE DATABASE LOCK-DOWN
-- Purpose: Fix "Constraint Blindness" — add UNIQUE constraints
-- required by approve-driver upsert operations
-- ═══════════════════════════════════════════════════════════

-- 1. fleets.owner_id — required by: .upsert({}, { onConflict: 'owner_id' })
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fleets_owner_id_key'
    ) THEN
        ALTER TABLE public.fleets ADD CONSTRAINT fleets_owner_id_key UNIQUE (owner_id);
    END IF;
END $$;

-- 2. fleet_assets.driver_id — one driver per truck, prevent duplicates on re-approval
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fleet_assets_driver_id_key'
    ) THEN
        ALTER TABLE public.fleet_assets ADD CONSTRAINT fleet_assets_driver_id_key UNIQUE (driver_id);
    END IF;
END $$;

-- 3. Ensure fleet_assets has year and color columns (approve-driver writes them)
ALTER TABLE public.fleet_assets ADD COLUMN IF NOT EXISTS year text;
ALTER TABLE public.fleet_assets ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE public.fleet_assets ADD COLUMN IF NOT EXISTS type text DEFAULT 'Standard';
