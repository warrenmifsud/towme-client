-- ============================================================
-- Atlas Demand Engine: Auto-Surge via Supply/Demand Detection
-- Authorized by: GOC Supreme Mandate
-- ============================================================

-- 1. VIEW: v_atlas_demand_overview
-- Real-time demand/supply ratio per service category
-- Atlas uses this to monitor the ecosystem pulse
DROP VIEW IF EXISTS public.v_atlas_demand_overview;
CREATE VIEW public.v_atlas_demand_overview AS
SELECT
    sc.id AS category_id,
    sc.name AS category_name,
    sc.surge_multiplier AS current_surge,

    -- Count pending requests in the last 30 minutes for this category
    COALESCE((
        SELECT COUNT(*)::INTEGER
        FROM public.towing_requests tr
        WHERE tr.category_id = sc.id
          AND tr.status = 'pending'
          AND tr.created_at >= NOW() - INTERVAL '30 minutes'
    ), 0) AS pending_requests,

    -- Count online drivers with this category in their active_categories
    COALESCE((
        SELECT COUNT(*)::INTEGER
        FROM public.driver_status ds
        WHERE ds.is_online = true
          AND sc.id = ANY(ds.active_categories)
    ), 0) AS online_drivers,

    -- Demand ratio: pending / max(drivers, 1) to avoid division by zero
    ROUND(
        COALESCE((
            SELECT COUNT(*)
            FROM public.towing_requests tr
            WHERE tr.category_id = sc.id
              AND tr.status = 'pending'
              AND tr.created_at >= NOW() - INTERVAL '30 minutes'
        ), 0)::NUMERIC
        /
        GREATEST(COALESCE((
            SELECT COUNT(*)
            FROM public.driver_status ds
            WHERE ds.is_online = true
              AND sc.id = ANY(ds.active_categories)
        ), 0)::NUMERIC, 1),
    2) AS demand_ratio,

    -- Atlas recommendation based on the ratio
    CASE
        WHEN COALESCE((
            SELECT COUNT(*)
            FROM public.towing_requests tr
            WHERE tr.category_id = sc.id
              AND tr.status = 'pending'
              AND tr.created_at >= NOW() - INTERVAL '30 minutes'
        ), 0)::NUMERIC
        /
        GREATEST(COALESCE((
            SELECT COUNT(*)
            FROM public.driver_status ds
            WHERE ds.is_online = true
              AND sc.id = ANY(ds.active_categories)
        ), 0)::NUMERIC, 1) >= 3.0 THEN 2.0
        WHEN COALESCE((
            SELECT COUNT(*)
            FROM public.towing_requests tr
            WHERE tr.category_id = sc.id
              AND tr.status = 'pending'
              AND tr.created_at >= NOW() - INTERVAL '30 minutes'
        ), 0)::NUMERIC
        /
        GREATEST(COALESCE((
            SELECT COUNT(*)
            FROM public.driver_status ds
            WHERE ds.is_online = true
              AND sc.id = ANY(ds.active_categories)
        ), 0)::NUMERIC, 1) >= 2.0 THEN 1.5
        WHEN COALESCE((
            SELECT COUNT(*)
            FROM public.towing_requests tr
            WHERE tr.category_id = sc.id
              AND tr.status = 'pending'
              AND tr.created_at >= NOW() - INTERVAL '30 minutes'
        ), 0)::NUMERIC
        /
        GREATEST(COALESCE((
            SELECT COUNT(*)
            FROM public.driver_status ds
            WHERE ds.is_online = true
              AND sc.id = ANY(ds.active_categories)
        ), 0)::NUMERIC, 1) >= 1.5 THEN 1.3
        ELSE 1.0
    END AS recommended_surge

FROM public.service_categories sc
WHERE sc.is_active = true;

GRANT SELECT ON public.v_atlas_demand_overview TO authenticated, service_role;

-- 2. FUNCTION: fn_atlas_demand_check()
-- Called manually via admin "Run Atlas Check" or could be scheduled via pg_cron
-- Auto-adjusts surge_multiplier based on demand/supply ratio
-- CAPS auto-surge at 2.0x — only admin manual override can go above
CREATE OR REPLACE FUNCTION public.fn_atlas_demand_check()
RETURNS TABLE (
    category_name TEXT,
    old_surge NUMERIC,
    new_surge NUMERIC,
    demand_ratio NUMERIC,
    action_taken TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec RECORD;
    v_pending INTEGER;
    v_drivers INTEGER;
    v_ratio NUMERIC;
    v_recommended NUMERIC;
    v_current NUMERIC;
BEGIN
    FOR rec IN
        SELECT id, name, surge_multiplier
        FROM public.service_categories
        WHERE is_active = true
    LOOP
        -- Count pending requests in last 30 minutes
        SELECT COUNT(*)::INTEGER INTO v_pending
        FROM public.towing_requests tr
        WHERE tr.category_id = rec.id
          AND tr.status = 'pending'
          AND tr.created_at >= NOW() - INTERVAL '30 minutes';

        -- Count available drivers for this category
        SELECT COUNT(*)::INTEGER INTO v_drivers
        FROM public.driver_status ds
        WHERE ds.is_online = true
          AND rec.id = ANY(ds.active_categories);

        -- Calculate demand ratio
        v_ratio := ROUND(v_pending::NUMERIC / GREATEST(v_drivers, 1)::NUMERIC, 2);

        -- Determine recommended surge (auto caps at 2.0)
        IF v_ratio >= 3.0 THEN
            v_recommended := 2.0;
        ELSIF v_ratio >= 2.0 THEN
            v_recommended := 1.5;
        ELSIF v_ratio >= 1.5 THEN
            v_recommended := 1.3;
        ELSE
            v_recommended := 1.0;
        END IF;

        v_current := COALESCE(rec.surge_multiplier, 1.0);

        -- Only update if recommendation differs from current
        -- AND only if current surge was set by Atlas or is at default
        -- Never downgrade a manual admin surge above 2.0
        IF v_recommended IS DISTINCT FROM v_current
           AND v_current <= 2.0 THEN

            UPDATE public.service_categories
            SET surge_multiplier = v_recommended,
                surge_authorized_by = 'ATLAS_AUTO'
            WHERE id = rec.id;

            category_name := rec.name;
            old_surge := v_current;
            new_surge := v_recommended;
            demand_ratio := v_ratio;
            action_taken := 'SURGE_ADJUSTED';
            RETURN NEXT;
        ELSE
            category_name := rec.name;
            old_surge := v_current;
            new_surge := v_current;
            demand_ratio := v_ratio;
            action_taken := CASE
                WHEN v_current > 2.0 THEN 'MANUAL_OVERRIDE_ACTIVE'
                ELSE 'NO_CHANGE'
            END;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_atlas_demand_check() TO authenticated, service_role;
