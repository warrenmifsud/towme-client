-- Relax Constraints: Ensure columns are nullable to prevent update failures
-- when clearing data or when OCR fails.

DO $$ BEGIN
    ALTER TABLE driver_applications ALTER COLUMN driving_license_front_expiry DROP NOT NULL;
    ALTER TABLE driver_applications ALTER COLUMN driving_license_back_expiry DROP NOT NULL;
    ALTER TABLE driver_applications ALTER COLUMN id_card_front_expiry DROP NOT NULL;
    ALTER TABLE driver_applications ALTER COLUMN id_card_back_expiry DROP NOT NULL;
    ALTER TABLE driver_applications ALTER COLUMN insurance_policy_expiry DROP NOT NULL;
    
    -- Also paths, just in case
    ALTER TABLE driver_applications ALTER COLUMN driving_license_front_path DROP NOT NULL;
    ALTER TABLE driver_applications ALTER COLUMN driving_license_back_path DROP NOT NULL;
    ALTER TABLE driver_applications ALTER COLUMN id_card_front_path DROP NOT NULL;
    ALTER TABLE driver_applications ALTER COLUMN id_card_back_path DROP NOT NULL;
    ALTER TABLE driver_applications ALTER COLUMN insurance_policy_path DROP NOT NULL;

    -- Ensure array type is nullable too
    ALTER TABLE driver_applications ALTER COLUMN tow_truck_types DROP NOT NULL;
    
EXCEPTION
    WHEN OTHERS THEN NULL; -- Ignore errors if columns don't exist (safety)
END $$;
