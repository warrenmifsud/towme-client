-- Add new columns to driver_applications table
ALTER TABLE public.driver_applications
ADD COLUMN IF NOT EXISTS tow_truck_make text,
ADD COLUMN IF NOT EXISTS tow_truck_model text,
ADD COLUMN IF NOT EXISTS tow_truck_year text,
ADD COLUMN IF NOT EXISTS tow_truck_registration_plate text,
ADD COLUMN IF NOT EXISTS tow_truck_color text,
ADD COLUMN IF NOT EXISTS services_offered text[];

-- Make tow_truck_types nullable since we might use specificity now, or keep it as legacy type buffer
ALTER TABLE public.driver_applications ALTER COLUMN tow_truck_types DROP NOT NULL;
