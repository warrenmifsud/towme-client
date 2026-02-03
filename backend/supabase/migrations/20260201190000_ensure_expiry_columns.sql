-- Ensure fields exist for Expiry Dates
ALTER TABLE public.driver_applications
ADD COLUMN IF NOT EXISTS driving_license_front_expiry date,
ADD COLUMN IF NOT EXISTS driving_license_back_expiry date,
ADD COLUMN IF NOT EXISTS id_card_front_expiry date,
ADD COLUMN IF NOT EXISTS id_card_back_expiry date,
ADD COLUMN IF NOT EXISTS insurance_policy_expiry date;

-- Grant permissions just in case
GRANT SELECT, UPDATE ON public.driver_applications TO authenticated;
GRANT SELECT, UPDATE ON public.driver_applications TO service_role;
