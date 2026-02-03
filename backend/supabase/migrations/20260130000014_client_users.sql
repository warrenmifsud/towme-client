-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
    CREATE POLICY "Admins can view all clients" ON public.clients FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Clients can view own profile" ON public.clients FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Trigger to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_client()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create record if role is 'client'
  IF new.raw_user_meta_data->>'role' = 'client' THEN
    INSERT INTO public.clients (id, email, full_name)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid duplication errors on verify
DROP TRIGGER IF EXISTS on_auth_user_created_client ON auth.users;

CREATE TRIGGER on_auth_user_created_client
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_client();
