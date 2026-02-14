-- Migration: Surge Multiplier + Audit Log
-- Date: 2026-02-14
-- Purpose: Implement real-time surge pricing with forensic audit trail

-- 1. Add surge columns to service_categories
ALTER TABLE public.service_categories
ADD COLUMN IF NOT EXISTS surge_multiplier DECIMAL(4,2) DEFAULT 1.0 CHECK (surge_multiplier >= 1.0 AND surge_multiplier <= 3.0),
ADD COLUMN IF NOT EXISTS surge_authorized_by TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS surge_updated_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.service_categories.surge_multiplier IS 'Real-time surge multiplier (1.0 = no surge, max 3.0). Only modified by Surge Expert.';
COMMENT ON COLUMN public.service_categories.surge_authorized_by IS 'Email of the admin/expert who last set the surge.';
COMMENT ON COLUMN public.service_categories.surge_updated_at IS 'Timestamp of last surge change.';

-- 2. Create surge_audit_log table
CREATE TABLE IF NOT EXISTS public.surge_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES public.service_categories(id) ON DELETE CASCADE NOT NULL,
  service_name TEXT NOT NULL,
  old_multiplier DECIMAL(4,2) NOT NULL,
  new_multiplier DECIMAL(4,2) NOT NULL,
  authorized_by TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Only admins can read/write audit logs
ALTER TABLE public.surge_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Admins can view surge audit logs"
    ON public.surge_audit_log FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Grant service_role full access for trigger operations
GRANT SELECT, INSERT ON public.surge_audit_log TO service_role;
GRANT SELECT ON public.surge_audit_log TO authenticated;

-- 3. Create trigger function to auto-log surge changes
CREATE OR REPLACE FUNCTION public.log_surge_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only log if surge_multiplier actually changed
    IF OLD.surge_multiplier IS DISTINCT FROM NEW.surge_multiplier THEN
        INSERT INTO public.surge_audit_log (
            service_id,
            service_name,
            old_multiplier,
            new_multiplier,
            authorized_by,
            applied_at
        ) VALUES (
            NEW.id,
            NEW.name,
            COALESCE(OLD.surge_multiplier, 1.0),
            NEW.surge_multiplier,
            COALESCE(NEW.surge_authorized_by, 'SYSTEM'),
            NOW()
        );

        -- Auto-stamp the surge_updated_at
        NEW.surge_updated_at := NOW();
    END IF;

    RETURN NEW;
END;
$$;

-- 4. Attach trigger to service_categories
DROP TRIGGER IF EXISTS trg_log_surge_change ON public.service_categories;
CREATE TRIGGER trg_log_surge_change
    BEFORE UPDATE ON public.service_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.log_surge_change();

-- 5. Recreate v_live_service_prices view WITH surge multiplier
DROP VIEW IF EXISTS public.v_live_service_prices;
CREATE OR REPLACE VIEW public.v_live_service_prices AS
SELECT
    sc.id,
    sc.name,
    sc.description,
    sc.icon_name,
    sc.is_active,
    sc.created_at,
    sc.surge_multiplier,
    sc.surge_authorized_by,
    sc.surge_updated_at,
    -- FORMULA: base_price × surge_multiplier × schedule_adjustment
    (sc.base_price * COALESCE(sc.surge_multiplier, 1.0) * (1 + COALESCE(
        (SELECT SUM(ps.percentage)
         FROM public.price_schedules ps
         WHERE ps.service_id = sc.id
           AND NOW() >= ps.start_time
           AND NOW() <= ps.end_time),
        0
    ) / 100)) AS base_price,
    -- Original base_price (pre-surge, pre-schedule)
    sc.base_price AS original_price
FROM public.service_categories sc;

-- Re-grant permissions on the updated view
GRANT SELECT ON public.v_live_service_prices TO anon, authenticated, service_role;
