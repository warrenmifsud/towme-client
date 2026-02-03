CREATE TABLE IF NOT EXISTS public.driver_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    application_type TEXT NOT NULL CHECK (application_type IN ('single', 'fleet')),
    
    -- Common Fields
    company_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    vat_number TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    tow_truck_types TEXT[] NOT NULL, -- Array of strings for types
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'contacted'))
);

-- Enable RLS
ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public application form)
-- Allow anyone to insert (public application form)
DO $$ BEGIN
    CREATE POLICY "Allow public insert to driver_applications" ON public.driver_applications FOR INSERT TO public WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Allow admins (or authenticated users for now) to view
DO $$ BEGIN
    CREATE POLICY "Allow auth users to view applications" ON public.driver_applications FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Allow admins to update status
DO $$ BEGIN
    CREATE POLICY "Allow auth users to update applications" ON public.driver_applications FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;
