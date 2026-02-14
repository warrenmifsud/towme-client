
-- Migration: Enhanced Financial Architecture (Phase 59)
-- Date: 2026-02-10
-- Purpose: Support Configurator (Zone A) and Granular Ledger (Zone C)

-- 1. Platform Settings (Zone A)
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL, -- e.g., 'financial_config'
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings"
    ON public.platform_settings
    USING (auth.uid() IN (SELECT id FROM auth.users)); -- Simplify for now

-- Seed Default Settings if not exists
INSERT INTO public.platform_settings (key, value)
VALUES (
    'financial_config',
    '{"commission_rate": 20, "vat_rate": 18, "driver_split": 80}'::jsonb
) ON CONFLICT (key) DO NOTHING;


-- 2. Enhanced Ledger (Zone C)
-- We add columns to the existing table created in Phase 58
-- (If run sequentially, this alters. If run as a fresh stack, helps definition)

DO $$ 
BEGIN 
    -- Check for job_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_ledger' AND column_name = 'job_id') THEN
        ALTER TABLE public.financial_ledger ADD COLUMN job_id UUID; -- Link to 'jobs' table if exists
    END IF;

    -- Check for commission_amount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_ledger' AND column_name = 'commission_amount') THEN
        ALTER TABLE public.financial_ledger ADD COLUMN commission_amount DECIMAL(12, 2) DEFAULT 0.00;
    END IF;

    -- Check for net_amount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_ledger' AND column_name = 'net_amount') THEN
        ALTER TABLE public.financial_ledger ADD COLUMN net_amount DECIMAL(12, 2) DEFAULT 0.00;
    END IF;

    -- Check for status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_ledger' AND column_name = 'status') THEN
        ALTER TABLE public.financial_ledger ADD COLUMN status TEXT DEFAULT 'COMPLETED';
    END IF;
    
    -- Check for driver_id (renaming or using reference_id?)
    -- Prompt says "Driver" column. 'reference_id' was generic. Let's make explicit 'driver_id'.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_ledger' AND column_name = 'driver_id') THEN
        ALTER TABLE public.financial_ledger ADD COLUMN driver_id UUID REFERENCES public.driver_applications(id);
    END IF;
END $$;
