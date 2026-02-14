-- Migration: Seed Fleet Assets (High-Density Directive)
-- Date: 2026-02-10
-- Purpose: Initial population of Fleet Assets for live verification

-- Function to safely get or create a fleet for the primary user
DO $$
DECLARE
    v_user_id uuid;
    v_fleet_id uuid;
BEGIN
    -- 1. Identify the Target User (Super Admin / Primary User)
    -- We'll try to find 'warrenmifsud@gmail.com' or fallback to the first user
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'warrenmifsud@gmail.com' LIMIT 1;
    
    -- Fallback if specific user not found (e.g. dev environment)
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    END IF;

    -- If no users exist, we can't seed
    IF v_user_id IS NOT NULL THEN
        
        -- 2. Ensure Fleet Exists
        SELECT id INTO v_fleet_id FROM public.fleets WHERE owner_id = v_user_id LIMIT 1;
        
        IF v_fleet_id IS NULL THEN
            INSERT INTO public.fleets (name, owner_id)
            VALUES ('Sentinel Fleet Alpha', v_user_id)
            RETURNING id INTO v_fleet_id;
        END IF;

        -- 3. Seed Assets (Idempotent Insert)
        -- Asset 1: Isuzu NQR
        IF NOT EXISTS (SELECT 1 FROM public.fleet_assets WHERE license_plate = 'TOW-001') THEN
            INSERT INTO public.fleet_assets (fleet_id, make, model, license_plate, vin, is_verified)
            VALUES (v_fleet_id, 'Isuzu', 'NQR 87', 'TOW-001', 'JH4NQR87654321098', true);
        END IF;

        -- Asset 2: Flatbed Class A
        IF NOT EXISTS (SELECT 1 FROM public.fleet_assets WHERE license_plate = 'FLT-777') THEN
            INSERT INTO public.fleet_assets (fleet_id, make, model, license_plate, vin, is_verified)
            VALUES (v_fleet_id, 'Peterbilt', '389 Flatbed', 'FLT-777', '1XP4DB9X3FD123456', true);
        END IF;

        -- Asset 3: Service Sentinel
        IF NOT EXISTS (SELECT 1 FROM public.fleet_assets WHERE license_plate = 'SRV-999') THEN
            INSERT INTO public.fleet_assets (fleet_id, make, model, license_plate, vin, is_verified)
            VALUES (v_fleet_id, 'Ford', 'F-550 Super Duty', 'SRV-999', '1FDOW5HT2LEC67890', true);
        END IF;

    END IF;
END $$;
