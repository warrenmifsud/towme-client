-- ═══════════════════════════════════════════════════════════
-- SCHEMA LOCK & TIMESTAMP SYNC
-- Purpose: Fix driver_status Access Denied wall + PostgREST cache
-- ═══════════════════════════════════════════════════════════

-- 1. Make location nullable (approve-driver doesn't provide initial location)
ALTER TABLE public.driver_status ALTER COLUMN location DROP NOT NULL;

-- 2. Set a default location for Malta center for any NULL locations
ALTER TABLE public.driver_status ALTER COLUMN location SET DEFAULT ST_SetSRID(ST_MakePoint(14.5146, 35.8989), 4326)::geography;

-- 3. Force PostgREST schema cache reload (MANDATORY for all future migrations)
NOTIFY pgrst, 'reload schema';
