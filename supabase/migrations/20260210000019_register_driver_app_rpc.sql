-- PROFESSIONAL UPSERT PROTOCOL [cite: 2026-02-10]
-- Compliance: Presidential Mandate - Architectural Fix
-- Handles 'REJECTED' -> 'PENDING' transition and blocks duplicates.

CREATE OR REPLACE FUNCTION public.register_driver_application(
    p_company_name TEXT,
    p_owner_name TEXT,
    p_vat_number TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_address TEXT,
    p_tow_truck_registration_plate TEXT,
    p_tow_truck_make TEXT,
    p_tow_truck_model TEXT,
    p_tow_truck_year TEXT,
    p_tow_truck_type TEXT,
    p_tow_truck_color TEXT,
    p_services_offered TEXT[],  -- Array of UUIDs or Names
    p_id_card_front_path TEXT,
    p_id_card_back_path TEXT,
    p_driving_license_front_path TEXT,
    p_driving_license_back_path TEXT,
    p_insurance_policy_path TEXT,
    p_id_card_front_expiry DATE DEFAULT NULL,
    p_id_card_back_expiry DATE DEFAULT NULL,
    p_driving_license_front_expiry DATE DEFAULT NULL,
    p_driving_license_back_expiry DATE DEFAULT NULL,
    p_insurance_policy_expiry DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to check/update
SET search_path = public, extensions
AS $$
DECLARE
    v_existing_status TEXT;
    v_existing_id UUID;
    v_new_id UUID;
BEGIN
    -- 1. Check for existing application by email
    SELECT id, status INTO v_existing_id, v_existing_status
    FROM public.driver_applications
    WHERE email = p_email
    LIMIT 1;

    -- 2. Logic Branching
    IF v_existing_id IS NOT NULL THEN
        -- Case A: Status is REJECTED (or DEFUNCT if that exists)
        IF v_existing_status = 'REJECTED' OR v_existing_status = 'rejected' THEN
            -- Resurrection Protocol: Update to PENDING
            UPDATE public.driver_applications
            SET 
                status = 'PENDING',
                -- Identity
                company_name = p_company_name,
                owner_name = p_owner_name,
                vat_number = p_vat_number,
                phone = p_phone,
                address = p_address,
                -- Vehicle
                tow_truck_registration_plate = p_tow_truck_registration_plate,
                tow_truck_make = p_tow_truck_make,
                tow_truck_model = p_tow_truck_model,
                tow_truck_year = p_tow_truck_year,
                tow_truck_type = p_tow_truck_type,
                tow_truck_color = p_tow_truck_color,
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
            WHERE id = v_existing_id
            RETURNING id INTO v_new_id;

            RETURN jsonb_build_object('success', true, 'id', v_new_id, 'action', 'updated');

        -- Case B: Status is PENDING, APPROVED, ACTIVE, SUSPENDED
        ELSE
            -- Block Protocol: Return standardized error
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'DUPLICATE_APPLICATION', 
                'message', 'An application with this email already exists and is ' || v_existing_status,
                'status', v_existing_status
            );
        END IF;

    ELSE
        -- Case C: New Application (Insert)
        INSERT INTO public.driver_applications (
            company_name, owner_name, vat_number, email, phone, address,
            tow_truck_registration_plate, tow_truck_make, tow_truck_model, tow_truck_year, tow_truck_type, tow_truck_color,
            services_offered,
            id_card_front_path, id_card_back_path, driving_license_front_path, driving_license_back_path, insurance_policy_path,
            id_card_front_expiry, id_card_back_expiry, driving_license_front_expiry, driving_license_back_expiry, insurance_policy_expiry,
            status
        ) VALUES (
            p_company_name, p_owner_name, p_vat_number, p_email, p_phone, p_address,
            p_tow_truck_registration_plate, p_tow_truck_make, p_tow_truck_model, p_tow_truck_year, p_tow_truck_type, p_tow_truck_color,
            p_services_offered,
            p_id_card_front_path, p_id_card_back_path, p_driving_license_front_path, p_driving_license_back_path, p_insurance_policy_path,
            p_id_card_front_expiry, p_id_card_back_expiry, p_driving_license_front_expiry, p_driving_license_back_expiry, p_insurance_policy_expiry,
            'PENDING'
        )
        RETURNING id INTO v_new_id;

        RETURN jsonb_build_object('success', true, 'id', v_new_id, 'action', 'inserted');
    END IF;
END;
$$;
