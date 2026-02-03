-- ALOW PUBLIC ACCESS (DEV MODE)
-- Run this in your Supabase Dashboard -> SQL Editor

-- 1. Drop the restrictive policy
drop policy if exists "Only Admins/Managers can insert/update categories" on public.service_categories;

-- 2. Create a permissive policy for development
DO $$ BEGIN
    create policy "Enable access to all users" on public.service_categories for all using (true) with check (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;
