-- Migration to add rejection_reason column to driver_applications table
-- Fixes 400 Bad Request error when submitting revisions

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'driver_applications'
        AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE driver_applications ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;
