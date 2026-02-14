-- TITAN-CLASS FUNCTION REPAIR [cite: 2026-02-10]
-- Resolves: 'Could not find function register_driver_application in schema cache'
-- Signatue matches client EXACTLY.
-- Columns map to proven DB schema (tow_truck_*).

CREATE OR REPLACE FUNCTION public.register_driver_application(
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
    p_tow_truck_year text, -- Changed to TEXT because client sends string (Date().getFullYear().toString())
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
    -- 1. CHECK FOR EXISTING DRIVER (PHOENIX PROTOCOL)
    SELECT status INTO v_existing_status
    FROM public.driver_applications
    WHERE email = p_email
    LIMIT 1;

    -- 2. HANDLE CONFLICTS
    IF v_existing_status IS NOT NULL THEN
        -- Case A: REJECTED -> Resurrection
        IF v_existing_status = 'REJECTED' OR v_existing_status = 'rejected' THEN
            UPDATE public.driver_applications
            SET 
                status = 'PENDING',
                -- Identity
                company_name = p_company_name,
                owner_name = p_owner_name,
                vat_number = p_vat_number,
                phone = p_phone,
                address = p_address,
                -- Vehicle (Mapping to tow_truck_*)
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
            WHERE email = p_email
            RETURNING id INTO v_new_id;

            RETURN jsonb_build_object('success', true, 'message', 'Application reactivated successfully.', 'id', v_new_id);
        
        -- Case B: Block Duplicate
        ELSE
            RETURN jsonb_build_object('success', false, 'message', 'An application with this email already exists.', 'error', 'DUPLICATE_APPLICATION');
        END IF;

    -- 3. INSERT NEW RECORD (If no conflict)
    ELSE
        INSERT INTO public.driver_applications (
            company_name, owner_name, vat_number, email, phone, address,
            tow_truck_registration_plate, tow_truck_make, tow_truck_model, tow_truck_year, tow_truck_type, tow_truck_color,
            services_offered,
            id_card_front_path, id_card_back_path, driving_license_front_path, driving_license_back_path, insurance_policy_path,
            id_card_front_expiry, id_card_back_expiry, driving_license_front_expiry, driving_license_back_expiry, insurance_policy_expiry,
            status, created_at
        ) VALUES (
            p_company_name, p_owner_name, p_vat_number, p_email, p_phone, p_address,
            p_tow_truck_registration_plate, p_tow_truck_make, p_tow_truck_model, p_tow_truck_year, p_tow_truck_type, p_tow_truck_color,
            p_services_offered,
            p_id_card_front_path, p_id_card_back_path, p_driving_license_front_path, p_driving_license_back_path, p_insurance_policy_path,
            p_id_card_front_expiry, p_id_card_back_expiry, p_driving_license_front_expiry, p_driving_license_back_expiry, p_insurance_policy_expiry,
            'PENDING', NOW()
        )
        RETURNING id INTO v_new_id;

        RETURN jsonb_build_object('success', true, 'id', v_new_id);
    END IF;
END;
$$;
