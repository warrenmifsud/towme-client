-- Relax RLS for driver_applications to allow anon access (matching vendor_applications)
-- This is necessary because the Admin Dashboard currently runs as an anon user (or without persistent auth)

DO $$ BEGIN
    CREATE POLICY "Allow anon read for driver_applications"
    ON public.driver_applications FOR SELECT
    TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow anon update for driver_applications"
    ON public.driver_applications FOR UPDATE
    TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow anon delete for driver_applications"
    ON public.driver_applications FOR DELETE
    TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;
