-- ═══════════════════════════════════════════════════════════
-- Part 3: GRANULAR DOCUMENT FORENSICS
-- Adds document_feedback JSONB column to driver_applications
-- Format: { "id_card_front": { "status": "verified"|"rejected"|"pending", "feedback": "..." }, ... }
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.driver_applications
ADD COLUMN IF NOT EXISTS document_feedback JSONB DEFAULT '{}';

COMMENT ON COLUMN public.driver_applications.document_feedback IS 'Per-document verification status and feedback. Keys: id_card_front, id_card_back, driving_license_front, driving_license_back, insurance_policy. Values: { status, feedback }';

-- ═══════════════════════════════════════════════════════════
-- Part 4: FINANCIAL BANK VAULT
-- Creates bank_details table with RLS protection
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.bank_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL,
    bank_name TEXT NOT NULL DEFAULT '',
    account_holder TEXT NOT NULL DEFAULT '',
    iban TEXT NOT NULL DEFAULT '',
    swift_bic TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint on profile_id (one bank record per driver)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bank_details_profile_id_key'
    ) THEN
        ALTER TABLE public.bank_details ADD CONSTRAINT bank_details_profile_id_key UNIQUE (profile_id);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.bank_details ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own bank details
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own bank details" ON public.bank_details;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Users can view own bank details" ON public.bank_details
    FOR SELECT USING (auth.uid() = profile_id);

-- Policy: Users can update own bank details
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can update own bank details" ON public.bank_details;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Users can update own bank details" ON public.bank_details
    FOR UPDATE USING (auth.uid() = profile_id);

-- Policy: Users can insert own bank details
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can insert own bank details" ON public.bank_details;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Users can insert own bank details" ON public.bank_details
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Policy: Service role / admins can view all
DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins can view all bank details" ON public.bank_details;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Admins can view all bank details" ON public.bank_details
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users u
            WHERE u.id = auth.uid()
            AND (u.raw_app_meta_data->>'role')::text IN ('admin', 'super_admin')
        )
    );

-- Grant access
GRANT SELECT, INSERT, UPDATE ON public.bank_details TO authenticated;
GRANT ALL ON public.bank_details TO service_role;
