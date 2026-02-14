-- Add Financial Columns to driver_status
ALTER TABLE public.driver_status
ADD COLUMN IF NOT EXISTS payout_type text DEFAULT 'COMMISSION' CHECK (payout_type IN ('COMMISSION', 'FIXED_WAGE')),
ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS partner_commission_rate numeric DEFAULT 15.0;

-- Comment on columns
COMMENT ON COLUMN public.driver_status.payout_type IS 'Financial Model: COMMISSION (Split) or FIXED_WAGE (Hourly)';
COMMENT ON COLUMN public.driver_status.hourly_rate IS 'Hourly rate for Fixed Wage drivers';
COMMENT ON COLUMN public.driver_status.partner_commission_rate IS 'Percentage taken by platform (Default 15%)';
