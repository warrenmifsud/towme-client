-- Add missing columns to vendors table to match application data
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS shop_address text,
ADD COLUMN IF NOT EXISTS lat float,
ADD COLUMN IF NOT EXISTS long float,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS shop_name text;

-- Make type nullable or default since we don't collect it yet
ALTER TABLE public.vendors ALTER COLUMN type DROP NOT NULL;
ALTER TABLE public.vendors ALTER COLUMN type SET DEFAULT 'mechanic'::public.vendor_type;

-- Update RLS to allow vendors to insert their own profile
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.vendors;
CREATE POLICY "Allow insert for authenticated users" 
ON public.vendors FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);
