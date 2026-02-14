-- Add verification columns if they do not exist
ALTER TABLE public.driver_applications 
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'UNVERIFIED';

-- 1. FIX TARGET ACCOUNT (Warren Mifsud)
UPDATE public.driver_applications
SET 
  is_verified = true,             
  verification_status = 'VERIFIED',
  status = 'ACTIVE' -- Ensure status matches the approval
WHERE email = 'warrenmifsud@gmail.com';

-- 2. DEPLOY "AUTO-VERIFY" TRIGGER (Future-Proofing)
CREATE OR REPLACE FUNCTION public.auto_verify_active_driver()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ACTIVE' THEN
    NEW.is_verified := true;
    NEW.verification_status := 'VERIFIED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_verification_on_active ON public.driver_applications;

CREATE TRIGGER enforce_verification_on_active
BEFORE UPDATE ON public.driver_applications
FOR EACH ROW
EXECUTE FUNCTION public.auto_verify_active_driver();
