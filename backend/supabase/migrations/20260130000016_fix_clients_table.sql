-- Ensure Clients table exists
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    contact_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Ensure Policies Exist (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Admins can view all clients'
    ) THEN
        CREATE POLICY "Admins can view all clients" ON public.clients FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Clients can view own profile'
    ) THEN
        CREATE POLICY "Clients can view own profile" ON public.clients FOR SELECT USING (auth.uid() = id);
    END IF;
END $$;

-- BACKFILL: Insert existing users from auth.users into public.clients
-- This is critical for displaying "already registered users"
INSERT INTO public.clients (id, email, full_name, contact_number, created_at)
SELECT 
    id, 
    email, 
    raw_user_meta_data->>'full_name', 
    raw_user_meta_data->>'contact_number',
    created_at
FROM auth.users
WHERE 
    raw_user_meta_data->>'role' = 'client' 
    AND id NOT IN (SELECT id FROM public.clients);

-- Re-create Trigger to ensure it captures everything correctly
CREATE OR REPLACE FUNCTION public.handle_new_client()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create record if role is 'client'
  IF new.raw_user_meta_data->>'role' = 'client' THEN
    INSERT INTO public.clients (id, email, full_name, contact_number, created_at)
    VALUES (
      new.id, 
      new.email, 
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'contact_number',
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      contact_number = EXCLUDED.contact_number;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_client ON auth.users;

CREATE TRIGGER on_auth_user_created_client
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_client();
