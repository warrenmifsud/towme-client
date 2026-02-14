-- ============================================================
-- GHOST ASSET CLEANUP: Decouple terminated drivers from fleet
-- RED-PULSE DIRECTIVE: 2026-02-12
-- ============================================================

-- 1. Add 'status' column to fleet_assets (if not present)
--    Valid values: 'AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'ORPHANED'
ALTER TABLE public.fleet_assets
ADD COLUMN IF NOT EXISTS status text DEFAULT 'AVAILABLE';

-- 2. Sync existing data: If driver_id is set, mark as ASSIGNED
UPDATE public.fleet_assets
SET status = 'ASSIGNED'
WHERE driver_id IS NOT NULL
  AND status = 'AVAILABLE';

-- 3. ONE-TIME GHOST CLEANUP: Null out driver_ids that reference non-existent auth users
UPDATE public.fleet_assets
SET driver_id = NULL,
    status = 'ORPHANED'
WHERE driver_id IS NOT NULL
  AND driver_id NOT IN (SELECT id FROM auth.users);

-- 4. CREATE TRIGGER: Auto-decouple on profile delete
CREATE OR REPLACE FUNCTION public.fn_decouple_fleet_on_profile_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.fleet_assets
    SET driver_id = NULL,
        status = 'ORPHANED',
        updated_at = now()
    WHERE driver_id = OLD.id;
    
    RAISE NOTICE '[GHOST-CLEANUP] Decoupled fleet assets from deleted profile: %', OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_decouple_fleet_assets ON public.profiles;

-- Create trigger BEFORE DELETE on profiles
CREATE TRIGGER trg_decouple_fleet_assets
    BEFORE DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_decouple_fleet_on_profile_delete();

-- 5. Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
