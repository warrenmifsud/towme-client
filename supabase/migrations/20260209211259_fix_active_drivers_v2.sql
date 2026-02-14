-- Migration: Emergency Infrastructure Restoration
-- Date: 2026-02-09
-- Purpose: Force Active Drivers View Creation (Ghost Elimination)

-- 1. Add Financial Columns to Driver Applications (if missing)
DO $$ BEGIN
    ALTER TABLE public.driver_applications ADD COLUMN IF NOT EXISTS payout_type TEXT CHECK (payout_type IN ('COMMISSION', 'FIXED_WAGE', 'HOURLY'));
    ALTER TABLE public.driver_applications ADD COLUMN IF NOT EXISTS payout_rate DECIMAL(10,2) DEFAULT 15.00;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2. Reconstruct View (RMC Logic)
CREATE OR REPLACE VIEW public.active_drivers AS
SELECT 
    da.id as application_id,
    da.owner_name,
    da.email,
    da.phone,
    da.company_name,
    da.tow_truck_registration_plate,
    da.tow_truck_make,
    da.tow_truck_model,
    da.status as application_status,
    p.id as profile_id,
    -- Driver ID (Fallback logic)
    COALESCE(ds.driver_id, p.id) as driver_id,
    
    -- GPS Data (From Driver Status) - Extracted safely
    ds.is_online,
    st_y(ds.location::geometry) as current_latitude,
    st_x(ds.location::geometry) as current_longitude,
    ds.updated_at as last_seen,
    
    -- Financial Data (From Driver Applications - Source of Truth)
    COALESCE(da.payout_type, 'COMMISSION') as payout_type,
    COALESCE(da.payout_rate, 15.00) as partner_commission_rate,
    0.00 as hourly_rate -- Placeholder for future expansion
FROM 
    public.driver_applications da
LEFT JOIN 
    public.profiles p ON da.email = p.email
LEFT JOIN
    public.driver_status ds ON p.id = ds.driver_id
WHERE 
    da.status = 'approved';

-- Grant Access
GRANT SELECT ON public.active_drivers TO authenticated;

COMMENT ON VIEW public.active_drivers IS 'Corrected View: Financials from Applications, GPS from Status (Live Sync).';
