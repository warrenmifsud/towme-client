-- Re-enable RLS for security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Allow users to view their OWN profile (essential for checking suspension status)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own client profile" ON public.clients;
    CREATE POLICY "Users can view own client profile" ON public.clients 
    FOR SELECT TO authenticated 
    USING (auth.uid() = id);
END $$;
