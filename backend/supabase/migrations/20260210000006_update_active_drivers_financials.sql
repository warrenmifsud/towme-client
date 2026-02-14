-- Migration: Update Active Drivers View with Financial Columns
-- Date: 2026-02-10
-- Purpose: Enforce Hard-Link between Intake and Financials by exposing financial data in the active_drivers view.

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
    ds.id as driver_id, -- Explicitly expose driver_id for Financials
    ds.is_online,
    ds.current_latitude,
    ds.current_longitude,
    ds.updated_at as last_seen,
    -- Financial Columns
    ds.payout_type,
    ds.partner_commission_rate,
    ds.hourly_rate
FROM 
    public.driver_applications da
LEFT JOIN 
    public.profiles p ON da.email = p.email
LEFT JOIN
    public.driver_status ds ON p.id = ds.id
WHERE 
    da.status = 'approved';

-- Grant Access
GRANT SELECT ON public.active_drivers TO authenticated;

COMMENT ON VIEW public.active_drivers IS 'Live view of drivers approved via Intake, including financial settings.';
