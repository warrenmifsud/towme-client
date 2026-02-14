-- ============================================================================
-- UPSERT LOGIC & PARTIAL INDEX LOCK
-- GOC-RMC Mandate [cite: 2026-02-12]
-- ============================================================================

-- 1. DROP any existing UNIQUE constraint on email (covers all possible names)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop unique indexes on email
    FOR r IN
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'driver_applications'
        AND indexdef ILIKE '%unique%'
        AND indexdef ILIKE '%email%'
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS public.' || quote_ident(r.indexname);
    END LOOP;

    -- Drop unique constraints on email
    FOR r IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.driver_applications'::regclass
        AND contype = 'u'
        AND conname ILIKE '%email%'
    LOOP
        EXECUTE 'ALTER TABLE public.driver_applications DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 2. CREATE PARTIAL UNIQUE INDEX (Only active/pending applications block duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS driver_email_active_unique
ON public.driver_applications (email)
WHERE status NOT IN ('rejected', 'terminated');

-- 3. CREATE OR REPLACE the register_driver_application RPC with UPSERT logic
CREATE OR REPLACE FUNCTION public.register_driver_application(
    p_company_name TEXT,
    p_owner_name TEXT,
    p_vat_number TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_address TEXT,
    p_application_type TEXT DEFAULT 'single',
    p_tow_truck_registration_plate TEXT DEFAULT 'PENDING',
    p_tow_truck_make TEXT DEFAULT 'Pending Setup',
    p_tow_truck_model TEXT DEFAULT 'Pending Setup',
    p_tow_truck_year TEXT DEFAULT NULL,
    p_tow_truck_type TEXT DEFAULT 'Standard',
    p_tow_truck_color TEXT DEFAULT 'Pending',
    p_services_offered TEXT[] DEFAULT '{}',
    p_id_card_front_path TEXT DEFAULT NULL,
    p_id_card_back_path TEXT DEFAULT NULL,
    p_driving_license_front_path TEXT DEFAULT NULL,
    p_driving_license_back_path TEXT DEFAULT NULL,
    p_insurance_policy_path TEXT DEFAULT NULL,
    p_id_card_front_expiry DATE DEFAULT NULL,
    p_id_card_back_expiry DATE DEFAULT NULL,
    p_driving_license_front_expiry DATE DEFAULT NULL,
    p_driving_license_back_expiry DATE DEFAULT NULL,
    p_insurance_policy_expiry DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing RECORD;
    new_id UUID;
BEGIN
    -- Check for existing application with this email
    SELECT id, status INTO existing
    FROM public.driver_applications
    WHERE email = p_email
    ORDER BY created_at DESC
    LIMIT 1;

    -- CASE 1: Active/Pending application exists → Block
    IF existing IS NOT NULL AND existing.status NOT IN ('rejected', 'terminated') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'DUPLICATE_APPLICATION',
            'message', 'An active application already exists for ' || p_email || '. Current status: ' || existing.status
        );
    END IF;

    -- CASE 2: Rejected/Terminated application exists → Reset to pending (UPSERT)
    IF existing IS NOT NULL AND existing.status IN ('rejected', 'terminated') THEN
        UPDATE public.driver_applications
        SET
            status = 'pending',
            company_name = p_company_name,
            owner_name = p_owner_name,
            vat_number = p_vat_number,
            phone = p_phone,
            address = p_address,
            application_type = p_application_type,
            tow_truck_registration_plate = p_tow_truck_registration_plate,
            tow_truck_make = p_tow_truck_make,
            tow_truck_model = p_tow_truck_model,
            tow_truck_year = p_tow_truck_year,
            tow_truck_type = p_tow_truck_type,
            tow_truck_color = p_tow_truck_color,
            services_offered = p_services_offered,
            id_card_front_path = p_id_card_front_path,
            id_card_back_path = p_id_card_back_path,
            driving_license_front_path = p_driving_license_front_path,
            driving_license_back_path = p_driving_license_back_path,
            insurance_policy_path = p_insurance_policy_path,
            driving_license_front_expiry = p_driving_license_front_expiry,
            driving_license_back_expiry = p_driving_license_back_expiry,
            insurance_policy_expiry = p_insurance_policy_expiry,
            is_verified = false,
            verification_status = NULL,
            updated_at = NOW()
        WHERE id = existing.id;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'RE-APPLICATION RECEIVED & RESET TO PENDING',
            'id', existing.id,
            'reapplication', true
        );
    END IF;

    -- CASE 3: No existing application → Fresh insert
    INSERT INTO public.driver_applications (
        company_name, owner_name, vat_number, email, phone, address,
        application_type, status,
        tow_truck_registration_plate, tow_truck_make, tow_truck_model,
        tow_truck_year, tow_truck_type, tow_truck_color, services_offered,
        id_card_front_path, id_card_back_path,
        driving_license_front_path, driving_license_back_path,
        insurance_policy_path,
        driving_license_front_expiry, driving_license_back_expiry,
        insurance_policy_expiry
    ) VALUES (
        p_company_name, p_owner_name, p_vat_number, p_email, p_phone, p_address,
        p_application_type, 'pending',
        p_tow_truck_registration_plate, p_tow_truck_make, p_tow_truck_model,
        p_tow_truck_year, p_tow_truck_type, p_tow_truck_color, p_services_offered,
        p_id_card_front_path, p_id_card_back_path,
        p_driving_license_front_path, p_driving_license_back_path,
        p_insurance_policy_path,
        p_driving_license_front_expiry, p_driving_license_back_expiry,
        p_insurance_policy_expiry
    )
    RETURNING id INTO new_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Application received successfully',
        'id', new_id,
        'reapplication', false
    );

EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'DUPLICATE_APPLICATION',
        'message', 'Duplicate key violation for email: ' || p_email
    );
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.register_driver_application TO anon;
GRANT EXECUTE ON FUNCTION public.register_driver_application TO authenticated;
