
-- Migration: Global Orchestration Controller (State Consistency Guard)
-- Date: 2026-02-10
-- Purpose: Enforce data propagation to Fleets, Assets, and Financials upon Driver Approval.

-- Function to handle Driver Approval Logic
CREATE OR REPLACE FUNCTION public.handle_driver_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_fleet_id uuid;
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- 1. Resolve User ID (Owner)
    -- Try to find profile by email. If not exists, we cannot proceed effectively without a user account.
    -- Assuming the user registered via the App and has a profile.
    SELECT id INTO v_user_id FROM public.profiles WHERE email = NEW.email;
    
    IF v_user_id IS NULL THEN
      -- Optional: Create a placeholder profile/user if your auth flow allows it. 
      -- For now, we assume the user must exist to be approved (or we log a warning).
      RAISE WARNING 'Approved application % has no matching profile for email %', NEW.id, NEW.email;
      RETURN NEW; -- Exit if no user
    END IF;

    -- 2. Create/Get Fleet (One Driver = One Fleet for Single Operators)
    INSERT INTO public.fleets (name, owner_id)
    VALUES (
      COALESCE(NEW.company_name, NEW.owner_name || '''s Fleet'), 
      v_user_id
    )
    ON CONFLICT (owner_id) DO UPDATE SET updated_at = now() -- Assumes one fleet per owner unique constraint or logic
    RETURNING id INTO v_fleet_id;
    
    -- If ON CONFLICT didn't return ID (because it updated), fetch it
    IF v_fleet_id IS NULL THEN
        SELECT id INTO v_fleet_id FROM public.fleets WHERE owner_id = v_user_id LIMIT 1;
    END IF;

    -- 3. Create/Update Fleet Asset (The Tow Truck)
    -- We assume the application contains the primary asset.
    INSERT INTO public.fleet_assets (
      fleet_id, 
      driver_id, 
      make, 
      model, 
      license_plate, 
      is_verified -- AUTO-VERIFY standard
    )
    VALUES (
      v_fleet_id,
      v_user_id, -- Driver drives their own truck
      NEW.tow_truck_make,
      NEW.tow_truck_model,
      NEW.tow_truck_registration_plate,
      true -- Approved by Super Admin = Verified
    );

    -- 4. Initialize Financials (Driver Status)
    INSERT INTO public.driver_status (
      id, 
      is_online, 
      partner_commission_rate, 
      hourly_rate
    )
    VALUES (
      v_user_id,
      false, -- Default offline
      15.00, -- Default Commission (Standard)
      0.00   -- Default Hourly
    )
    ON CONFLICT (id) DO UPDATE SET 
      partner_commission_rate = 15.00; -- Ensure standard rate is applied

    -- 5. Update Profile to set is_fleet_manager = true (if applicable)
    UPDATE public.profiles 
    SET 
        fleet_id = v_fleet_id,
        is_fleet_manager = true,
        role = 'driver' -- Ensure they are promoted to driver role if not already
    WHERE id = v_user_id;

  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Definition
DROP TRIGGER IF EXISTS on_driver_approval ON public.driver_applications;

CREATE TRIGGER on_driver_approval
AFTER UPDATE OF status ON public.driver_applications
FOR EACH ROW
EXECUTE FUNCTION public.handle_driver_approval();

-- Comment
COMMENT ON FUNCTION public.handle_driver_approval IS 'GOC Trigger: Propagates approval to Fleets, Assets, and Financials.';
