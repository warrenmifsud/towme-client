-- Add missing updated_at column to driver_applications
-- This column is required by the update_driver_application_v3 RPC.

ALTER TABLE driver_applications 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
