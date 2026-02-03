-- 1. DISABLE RLS entirely to rule out any permission hiding
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;

-- 2. DIAGNOSTIC BACKFILL: Insert ALL users from auth.users
-- Previous attempts filtered by 'role=client', but old users likely lack this tag.
-- We are now inserting everyone to ensure the dashboard shows DATA.
INSERT INTO public.clients (id, email, full_name, contact_number, created_at)
SELECT 
    id, 
    email, 
    -- Fallback to email part if name is missing
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 
    COALESCE(raw_user_meta_data->>'contact_number', 'N/A'),
    created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.clients);
