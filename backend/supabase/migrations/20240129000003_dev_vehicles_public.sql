-- ALLOW PUBLIC ACCESS TO VEHICLES (DEV MODE)
-- Run this in your Supabase Dashboard -> SQL Editor

-- 1. Drop existing user-only policy if it exists
drop policy if exists "Users can manage their own vehicles" on public.vehicles;

-- 2. Create permissive policy for development
DO $$ BEGIN
    create policy "Enable all access for development" on public.vehicles for all using (true) with check (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;
