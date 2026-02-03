-- RPC to allow updating an application by ID (Bypassing RLS for Anon Users)
-- Security: We strictly filter by ID.
-- We accept a JSON object and map fields.
-- ROBUST UPDATE: Handles empty strings by treating them as NULL or ignoring them.
-- FIX: Mapped tow_truck_type -> tow_truck_types (ARRAY)

CREATE OR REPLACE FUNCTION update_driver_application(
    p_id UUID,
    p_data JSONB
)
RETURNS VOID
SECURITY DEFINER -- Runs as Postgres/Admin
AS $$
BEGIN
    UPDATE driver_applications
    SET
        company_name = COALESCE(NULLIF(p_data->>'company_name', ''), company_name),
        owner_name = COALESCE(NULLIF(p_data->>'owner_name', ''), owner_name),
        vat_number = COALESCE(NULLIF(p_data->>'vat_number', ''), vat_number),
        email = COALESCE(NULLIF(p_data->>'app_email', ''), email),
        phone = COALESCE(NULLIF(p_data->>'phone', ''), phone),
        address = COALESCE(NULLIF(p_data->>'address', ''), address),
        
        tow_truck_make = COALESCE(NULLIF(p_data->>'tow_truck_make', ''), tow_truck_make),
        tow_truck_model = COALESCE(NULLIF(p_data->>'tow_truck_model', ''), tow_truck_model),
        tow_truck_year = COALESCE(NULLIF(p_data->>'tow_truck_year', ''), tow_truck_year),
        
        -- FIX: Use tow_truck_types (Array) instead of _type (Text)
        -- Map single input 'tow_truck_type' to ARRAY[]
        tow_truck_types = (
            CASE 
                WHEN NULLIF(p_data->>'tow_truck_type', '') IS NOT NULL 
                THEN ARRAY[NULLIF(p_data->>'tow_truck_type', '')]
                ELSE tow_truck_types 
            END
        ),
        
        tow_truck_registration_plate = COALESCE(NULLIF(p_data->>'tow_truck_registration_plate', ''), tow_truck_registration_plate),
        tow_truck_color = COALESCE(NULLIF(p_data->>'tow_truck_color', ''), tow_truck_color),
        
        -- Services: Default to empty array if NULL, else parse.
        services_offered = (
            CASE 
                WHEN p_data->'services_offered' IS NOT NULL AND jsonb_array_length(p_data->'services_offered') > 0
                THEN (
                    SELECT array_agg(x) 
                    FROM jsonb_array_elements_text(p_data->'services_offered') t(x)
                )
                WHEN p_data->'services_offered' IS NOT NULL AND jsonb_array_length(p_data->'services_offered') = 0
                THEN '{}'::text[]
                ELSE services_offered 
            END
        ),

        -- Documents: Use NULLIF(..., '') to ensure empty strings don't crash DATE columns or overwrite valid paths with ''
        driving_license_front_path = COALESCE(NULLIF(p_data->>'driving_license_front', ''), driving_license_front_path),
        driving_license_front_expiry = NULLIF(p_data->>'driving_license_front_expiry', ''),
        
        driving_license_back_path = COALESCE(NULLIF(p_data->>'driving_license_back', ''), driving_license_back_path),
        driving_license_back_expiry = NULLIF(p_data->>'driving_license_back_expiry', ''),
        
        id_card_front_path = COALESCE(NULLIF(p_data->>'id_card_front', ''), id_card_front_path),
        id_card_front_expiry = NULLIF(p_data->>'id_card_front_expiry', ''),
        
        id_card_back_path = COALESCE(NULLIF(p_data->>'id_card_back', ''), id_card_back_path),
        id_card_back_expiry = NULLIF(p_data->>'id_card_back_expiry', ''),
        
        insurance_policy_path = COALESCE(NULLIF(p_data->>'insurance_policy', ''), insurance_policy_path),
        insurance_policy_expiry = NULLIF(p_data->>'insurance_policy_expiry', ''),

        -- Reset Status
        status = 'pending',
        rejection_reason = NULL,
        verification_report = NULL, 
        verification_score = NULL,
        updated_at = NOW()
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION update_driver_application(UUID, JSONB) TO public;
GRANT EXECUTE ON FUNCTION update_driver_application(UUID, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION update_driver_application(UUID, JSONB) TO authenticated;
