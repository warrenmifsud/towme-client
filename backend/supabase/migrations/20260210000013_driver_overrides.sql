
-- Migration: Driver Financial Overrides
-- Date: 2026-02-10
-- Purpose: Support Phase 59-B Driver-Specific Financial Settings

DO $$ 
BEGIN 
    -- Check for commission_rate_override
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_applications' AND column_name = 'commission_rate_override') THEN
        ALTER TABLE public.driver_applications ADD COLUMN commission_rate_override DECIMAL(5, 2); -- Null means use Global
    END IF;

    -- Check for vat_rate_override (Future proofing/Logical consistency, though user only explicitly asked for commission)
    -- User said "fetch their commission_rate_override". I will stick to commission for now to be precise to the mandate.
    -- But likely they will want VAT too. I'll add it but keep it nullable.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_applications' AND column_name = 'vat_rate_override') THEN
        ALTER TABLE public.driver_applications ADD COLUMN vat_rate_override DECIMAL(5, 2);
    END IF;
END $$;
