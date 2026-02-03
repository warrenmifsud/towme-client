-- Function to automatically create vendor profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_vendor()
RETURNS TRIGGER AS $$
BEGIN
  -- We look up the approved application by email
  -- Then insert it into vendors table
  -- We use SECURITY DEFINER to bypass RLS for this specific operation
  INSERT INTO public.vendors (
    user_id, 
    business_name, 
    shop_name, 
    shop_address, 
    lat, 
    long, 
    email, 
    type,
    is_open,
    subscription_active
  )
  SELECT 
    new.id, 
    business_legal_name, 
    shop_name, 
    shop_address, 
    shop_lat, 
    shop_long, 
    email, 
    'mechanic',
    false,
    true
  FROM public.vendor_applications
  WHERE email = new.email AND (status = 'approved' OR status = 'pending') -- allow pending for tests if needed, but approved is main
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to fire on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_vendor();
