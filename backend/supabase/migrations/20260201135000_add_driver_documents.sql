-- Add document columns to driver_applications table
ALTER TABLE public.driver_applications
ADD COLUMN IF NOT EXISTS driving_license_front_path text,
ADD COLUMN IF NOT EXISTS driving_license_front_expiry date,
ADD COLUMN IF NOT EXISTS driving_license_back_path text,
ADD COLUMN IF NOT EXISTS driving_license_back_expiry date,
ADD COLUMN IF NOT EXISTS id_card_front_path text,
ADD COLUMN IF NOT EXISTS id_card_front_expiry date,
ADD COLUMN IF NOT EXISTS id_card_back_path text,
ADD COLUMN IF NOT EXISTS id_card_back_expiry date,
ADD COLUMN IF NOT EXISTS insurance_policy_path text,
ADD COLUMN IF NOT EXISTS insurance_policy_expiry date;

-- Create storage bucket for driver documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'driver_documents',
    'driver_documents',
    true,
    5242880, -- 5MB limit
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- RLS for Storage
-- Allow anyone to upload (since registration is public)
DO $$ BEGIN
    CREATE POLICY "Allow public uploads driver_docs"
    ON storage.objects FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'driver_documents');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow anyone to read (for now, to ensure they can see what they uploaded or admin can see)
DO $$ BEGIN
    CREATE POLICY "Allow public read driver_docs"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'driver_documents');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
