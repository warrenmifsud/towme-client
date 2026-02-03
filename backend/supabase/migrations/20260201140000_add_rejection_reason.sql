-- Add rejection_reason column to driver_applications table
ALTER TABLE public.driver_applications
ADD COLUMN IF NOT EXISTS rejection_reason text;
