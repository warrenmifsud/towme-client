-- Add contact_number to public.clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contact_number TEXT;

-- Update trigger function to include contact_number
CREATE OR REPLACE FUNCTION public.handle_new_client()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create record if role is 'client'
  IF new.raw_user_meta_data->>'role' = 'client' THEN
    INSERT INTO public.clients (id, email, full_name, contact_number)
    VALUES (
      new.id, 
      new.email, 
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'contact_number'
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
