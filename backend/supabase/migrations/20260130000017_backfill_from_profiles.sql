-- 1. Grant explicit permissions to ensure visibility
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT ON public.clients TO service_role;

-- 2. Robust Backfill from PROFILES table (Source of Truth)
-- This catches users who have a profile but missing metadata 'role'
INSERT INTO public.clients (id, email, full_name, contact_number, created_at)
SELECT 
    p.id, 
    p.email, 
    p.full_name, 
    u.raw_user_meta_data->>'contact_number',
    p.created_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE 
    p.role = 'client' 
    AND p.id NOT IN (SELECT id FROM public.clients);

-- 3. Ensure Policy is definitely correct (idempotent re-run)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;
    CREATE POLICY "Admins can view all clients" ON public.clients FOR SELECT TO authenticated USING (true);
END $$;
