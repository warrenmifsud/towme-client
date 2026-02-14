-- Migration: Atomic Driver Approval RPC
-- Date: 2026-02-10
-- Purpose: Single transaction to approve driver, linking Profile -> Fleet -> Asset -> Financials

CREATE OR REPLACE FUNCTION public.approve_driver_application(app_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    app_record RECORD;
    user_profile_id UUID;
    new_fleet_id UUID;
    audit_log JSONB;
BEGIN
    -- 1. Lock & Load Application
    SELECT * INTO app_record FROM public.driver_applications WHERE id = app_id;
    
    IF app_record IS NULL THEN
        RAISE EXCEPTION 'Application not found';
    END IF;

    IF app_record.status = 'approved' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already approved');
    END IF;

    -- 2. Resolve Profile (Must Exist)
    SELECT id INTO user_profile_id FROM public.profiles WHERE email = app_record.email;

    IF user_profile_id IS NULL THEN
        RAISE EXCEPTION 'Profile not found for email %. User must register first.', app_record.email;
    END IF;

    -- 3. Fleet Resolution (Create or Fetch)
    -- Check if user already has a fleet (unlikely for new partner, but possible)
    SELECT id INTO new_fleet_id FROM public.fleets WHERE owner_id = user_profile_id LIMIT 1;

    IF new_fleet_id IS NULL THEN
        INSERT INTO public.fleets (name, owner_id)
        VALUES (app_record.company_name, user_profile_id)
        RETURNING id INTO new_fleet_id;
    END IF;

    -- 4. Promote Profile
    UPDATE public.profiles
    SET 
        role = 'driver',
        fleet_id = new_fleet_id,
        is_fleet_manager = true
    WHERE id = user_profile_id;

    -- 5. Register Asset (Tow Truck)
    INSERT INTO public.fleet_assets (
        fleet_id,
        driver_id,
        make,
        model,
        license_plate,
        is_verified
    )
    VALUES (
        new_fleet_id,
        user_profile_id, -- Assign to owner for single-driver fleets
        app_record.tow_truck_make,
        app_record.tow_truck_model,
        app_record.tow_truck_registration_plate,
        true -- Instant Verification
    );

    -- 6. Initialize Financials
    INSERT INTO public.driver_status (
        id, 
        status, 
        payout_type, 
        partner_commission_rate
    )
    VALUES (
        user_profile_id,
        'offline', -- Default to offline
        COALESCE(app_record.payout_type, 'COMMISSION'),
        COALESCE(app_record.payout_rate, 15.00)
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        payout_type = EXCLUDED.payout_type,
        partner_commission_rate = EXCLUDED.partner_commission_rate;

    -- 7. Finalize Application
    UPDATE public.driver_applications
    SET status = 'approved'
    WHERE id = app_id;

    RETURN jsonb_build_object(
        'success', true,
        'driver_id', user_profile_id,
        'fleet_id', new_fleet_id
    );

EXCEPTION WHEN OTHERS THEN
    -- Transaction automatically rolls back on exception
    RAISE;
END;
$$;
