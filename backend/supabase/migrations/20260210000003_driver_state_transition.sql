
-- Migration: Driver State Transition (Active Drivers View)
-- Date: 2026-02-10
-- Purpose: Formalize the "Move to Active" logic by creating a view for approved drivers.

-- 1. Create View for Active Drivers
-- This view aggregates verified driver data from applications and profiles/status
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
    ds.is_online,
    ds.current_latitude,
    ds.current_longitude,
    ds.updated_at as last_seen
FROM 
    public.driver_applications da
LEFT JOIN 
    public.profiles p ON da.email = p.email
LEFT JOIN
    public.driver_status ds ON p.id = ds.id
WHERE 
    da.status = 'approved';

-- 2. Security: Grant Access
ALTER VIEW public.active_drivers OWNER TO postgres;
GRANT SELECT ON public.active_drivers TO authenticated;

-- Comment
COMMENT ON VIEW public.active_drivers IS 'Live view of drivers who have been approved via the Intake Console.';
