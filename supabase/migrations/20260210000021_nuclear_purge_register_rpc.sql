-- TITAN-CLASS NUCLEAR CLEANSE & PHOENIX PROTOCOL [cite: 2026-02-10]
-- Compliance: Presidential Mandate
-- 1. PURGE: Drops all function signatures to resolve collision.
-- 2. RESTORE: Deploys single source of truth with Upsert Logic.

-- 1. Dynamic Drop (Nuclear Cleanse)
DO $$
DECLARE
   r RECORD;
BEGIN
   FOR r IN SELECT oid::regprocedure AS func_signature
            FROM pg_proc
            WHERE proname = 'register_driver_application'
            AND pronamespace = 'public'::regnamespace
   LOOP
      EXECUTE 'DROP FUNCTION ' || r.func_signature;
      RAISE NOTICE 'Dropped legacy function: %', r.func_signature;
   END LOOP;
END $$;

-- 2. DEPLOY SINGLE SOURCE OF TRUTH (Phoenix Protocol)
CREATE FUNCTION public.register_driver_application(
    p_address text,
    p_company_name text,
    p_driving_license_back_expiry date,
    p_driving_license_back_path text,
    p_driving_license_front_expiry date,
    p_driving_license_front_path text,
    p_email text,
    p_id_card_back_expiry date,
    p_id_card_back_path text,
    p_id_card_front_expiry date,
    p_id_card_front_path text,
    p_insurance_policy_expiry date,
    p_insurance_policy_path text,
    p_owner_name text,
    p_phone text,
    p_services_offered text[],
    p_tow_truck_color text,
    p_tow_truck_make text,
    p_tow_truck_model text,
    p_tow_truck_registration_plate text,
    p_tow_truck_type text,
    p_tow_truck_year text, -- Corrected to TEXT to match Client's .toString()
    p_vat_number text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_status text;
    v_new_id uuid;
BEGIN
    -- PHOENIX LOGIC: Check for existing Rejected applicant
    SELECT status INTO v_existing_status
    FROM public.driver_applications
    WHERE email = p_email;

    -- HANDLE CONFLICTS
    IF v_existing_status = 'REJECTED' OR v_existing_status = 'rejected' THEN
        -- Resurrection Protocol
        UPDATE public.driver_applications
        SET 
            status = 'PENDING',
            is_verified = false,
            updated_at = NOW(),
            -- Identity
            address = p_address,
            phone = p_phone,
            owner_name = p_owner_name,
            company_name = 'TOWME OFFICIAL', -- Mandated Hardcode
            vat_number = p_vat_number,
            -- Vehicle (Mapped to Correct Columns)
            tow_truck_type = p_tow_truck_type,
            tow_truck_make = p_tow_truck_make,
            tow_truck_model = p_tow_truck_model,
            tow_truck_year = p_tow_truck_year,
            tow_truck_color = p_tow_truck_color,
            tow_truck_registration_plate = p_tow_truck_registration_plate,
            -- Documents
            id_card_front_path = p_id_card_front_path,
            id_card_back_path = p_id_card_back_path,
            driving_license_front_path = p_driving_license_front_path,
            driving_license_back_path = p_driving_license_back_path,
            insurance_policy_path = p_insurance_policy_path,
            id_card_front_expiry = p_id_card_front_expiry,
            id_card_back_expiry = p_id_card_back_expiry,
            driving_license_front_expiry = p_driving_license_front_expiry,
            driving_license_back_expiry = p_driving_license_back_expiry,
            insurance_policy_expiry = p_insurance_policy_expiry
        WHERE email = p_email
        RETURNING id INTO v_new_id;
        
        RETURN jsonb_build_object('success', true, 'id', v_new_id, 'message', 'Phoenix Activated');

    ELSIF v_existing_status IS NOT NULL THEN
         RETURN jsonb_build_object('success', false, 'message', 'Application already exists', 'error', 'DUPLICATE_APPLICATION');
    END IF;

    -- INSERT NEW RECORD
    INSERT INTO public.driver_applications (
        email, owner_name, phone, address, 
        tow_truck_type, tow_truck_make, tow_truck_model, tow_truck_year, tow_truck_color, tow_truck_registration_plate,
        status, created_at, company_name, is_verified,
        vat_number, services_offered,
        id_card_front_path, id_card_back_path, driving_license_front_path, driving_license_back_path, insurance_policy_path,
        id_card_front_expiry, id_card_back_expiry, driving_license_front_expiry, driving_license_back_expiry, insurance_policy_expiry
    ) VALUES (
        p_email, p_owner_name, p_phone, p_address,
        p_tow_truck_type, p_tow_truck_make, p_tow_truck_model, p_tow_truck_year, p_tow_truck_color, p_tow_truck_registration_plate,
        'PENDING', NOW(), 'TOWME OFFICIAL', false,
        p_vat_number, p_services_offered,
        p_id_card_front_path, p_id_card_back_path, p_driving_license_front_path, p_driving_license_back_path, p_insurance_policy_path,
        p_id_card_front_expiry, p_id_card_back_expiry, p_driving_license_front_expiry, p_driving_license_back_expiry, p_insurance_policy_expiry
    )
    RETURNING id INTO v_new_id;
    
    RETURN jsonb_build_object('success', true, 'id', v_new_id);
END;
$$;

-- 3. RELOAD CACHE
NOTIFY pgrst, 'reload schema';
