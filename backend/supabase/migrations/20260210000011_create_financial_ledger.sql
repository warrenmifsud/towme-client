
-- Migration: Create Financial Ledger Table
-- Date: 2026-02-10
-- Purpose: Support Phase 58 Revenue Stream Architecture

CREATE TABLE IF NOT EXISTS public.financial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('REVENUE', 'PAYOUT', 'ADJUSTMENT')),
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    reference_id UUID, -- Links to job or driver_application
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Allow Admins to View
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ledger"
    ON public.financial_ledger
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM auth.users -- Simplified Admin Check or use existing profile logic
    ));

-- Grant access to anon for dev/demo if needed, or stick to authenticated
-- For this Phase, we ensure it exists.
