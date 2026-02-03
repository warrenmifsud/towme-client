-- 1. Fix RLS for vendor_applications to allow authenticated users to read it
-- This allows the dashboard to fetch the shop name if the profile is missing
-- 1. Fix RLS for vendor_applications to allow authenticated users to read it
-- This allows the dashboard to fetch the shop name if the profile is missing
DO $$ BEGIN
    CREATE POLICY "Allow authenticated users to read applications" ON public.vendor_applications FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Update the trigger to be case-insensitive to avoid mismatches
CREATE OR REPLACE FUNCTION public.handle_new_vendor()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.vendors (
    user_id, business_name, shop_name, shop_address, lat, long, email, type, is_open, subscription_active
  )
  SELECT 
    new.id, business_legal_name, shop_name, shop_address, shop_lat, shop_long, email, 'mechanic', false, true
  FROM public.vendor_applications
  WHERE LOWER(email) = LOWER(new.email) AND status = 'approved'
  ORDER BY created_at DESC
  LIMIT 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
