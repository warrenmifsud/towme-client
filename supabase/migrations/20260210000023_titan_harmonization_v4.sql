-- TITAN-CLASS SCHEMA HARMONIZATION (V4.0) [cite: 2026-02-10]
-- MANDATE: ALIGNMENT WITH PHYSICAL REALITY (inspect_schema.ts)
-- Compliance: Presidential Directive

-- 1. NUCLEAR PURGE OF ALL CLASHING SIGNATURES
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure AS func_signature
        FROM pg_proc
        WHERE proname = 'register_driver_application'
        AND pronamespace = 'public'::regnamespace
    ) LOOP
        EXECUTE 'DROP FUNCTION ' || r.func_signature;
        RAISE NOTICE 'Liquidated legacy signature: %', r.func_signature;
    END LOOP;
END $$;

-- 2. DEPLOY SINGLE SOURCE OF TRUTH (VERIFIED PHYSICAL MAPPING)
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
    p_tow_truck_year text,
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
    -- PHOENIX PROTOCOL: REACTIVATE REJECTED IDENTITIES
    SELECT status INTO v_existing_status FROM public.driver_applications WHERE email = p_email;

    IF v_existing_status = 'REJECTED' OR v_existing_status = 'rejected' THEN
        UPDATE public.driver_applications
        SET 
            status = 'PENDING',
            is_verified = false,
            address = p_address,
            phone = p_phone,
            
            -- PHYSICAL COLUMN MAPPING (Verified via inspect_schema.ts)
            vehicle_type = p_tow_truck_type,           -- Mapped: vehicle_type
            tow_truck_make = p_tow_truck_make,         -- Mapped: tow_truck_make
            tow_truck_model = p_tow_truck_model,       -- Mapped: tow_truck_model
            tow_truck_year = p_tow_truck_year,         -- Mapped: tow_truck_year
            tow_truck_color = p_tow_truck_color,       -- Mapped: tow_truck_color
            tow_truck_registration_plate = p_tow_truck_registration_plate, -- Mapped: tow_truck_registration_plate
            
            created_at = NOW(),
            -- Identity Updates
            company_name = 'TOWME OFFICIAL',
            owner_name = p_owner_name,
            vat_number = p_vat_number,
            -- Services
            services_offered = p_services_offered,
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
            insurance_policy_expiry = p_insurance_policy_expiry,
            -- Reset Meta
            rejection_reason = NULL,
            rejected_at = NULL,
            updated_at = NOW()
        WHERE email = p_email
        RETURNING id INTO v_new_id;
        
        RETURN jsonb_build_object('success', true, 'message', 'Phoenix Activated', 'id', v_new_id);
    ELSIF v_existing_status IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Application already in progress', 'error', 'DUPLICATE_APPLICATION');
    END IF;

    -- FRESH MANIFESTATION (PHYSICAL COLUMN MAPPING)
    INSERT INTO public.driver_applications (
        email, owner_name, phone, address, 
        
        -- Physical Columns
        vehicle_type, 
        tow_truck_make, 
        tow_truck_model, 
        tow_truck_year, 
        tow_truck_color, 
        tow_truck_registration_plate,
        
        status, created_at, company_name, is_verified,
        vat_number, services_offered,
        id_card_front_path, id_card_back_path, driving_license_front_path, driving_license_back_path, insurance_policy_path,
        id_card_front_expiry, id_card_back_expiry, driving_license_front_expiry, driving_license_back_expiry, insurance_policy_expiry
    ) VALUES (
        p_email, p_owner_name, p_phone, p_address,
        
        p_tow_truck_type, 
        p_tow_truck_make, 
        p_tow_truck_model, 
        p_tow_truck_year, 
        p_tow_truck_color, 
        p_tow_truck_registration_plate,
        
        'PENDING', NOW(), 'TOWME OFFICIAL', false,
        p_vat_number, p_services_offered,
        p_id_card_front_path, p_id_card_back_path, p_driving_license_front_path, p_driving_license_back_path, p_insurance_policy_path,
        p_id_card_front_expiry, p_id_card_back_expiry, p_driving_license_front_expiry, p_driving_license_back_expiry, p_insurance_policy_expiry
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'id', v_new_id);
END;
$$;

-- 3. FORCE SCHEMA REGENERATION
NOTIFY pgrst, 'reload schema';
