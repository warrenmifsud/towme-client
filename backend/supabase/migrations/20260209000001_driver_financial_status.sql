-- Migration: Add payout_type to driver_status
-- Date: 2026-02-09
-- Purpose: Enable "Selective Commission" architecture

-- Use text with check constraint for flexibility (simulating ENUM)
ALTER TABLE public.driver_status
DROP COLUMN IF EXISTS is_fixed_wage, -- Drop previous attempt if it exists
ADD COLUMN IF NOT EXISTS payout_type TEXT DEFAULT 'COMMISSION' CHECK (payout_type IN ('COMMISSION', 'FIXED_WAGE'));

COMMENT ON COLUMN public.driver_status.payout_type IS 'COMMISSION (15% split) or FIXED_WAGE (0% split/salary).';
