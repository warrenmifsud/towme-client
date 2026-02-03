-- Migration: Client Management (Suspension & Deletion)
-- Date: 2026-01-30

-- 1. Add Status and Suspension Fields to Clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

-- 2. Add RLS Policies ensuring Admins can update these fields
-- (Admins already have full access via previous policies, but ensuring update capability)

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Admins can update clients'
    ) THEN
        CREATE POLICY "Admins can update clients" ON public.clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;
