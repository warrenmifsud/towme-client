
-- Migration: Security & Audit Nexus (Phase 60)
-- Date: 2026-02-10
-- Purpose: Audit Logging for Admin Actions

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email TEXT NOT NULL DEFAULT 'warrenmifsud@gmail.com', -- Default as per mandate, but logic should override
    action TEXT NOT NULL, -- e.g., 'APPROVE_DRIVER', 'REJECT_DRIVER'
    target TEXT NOT NULL, -- e.g., 'Driver: John Doe (ID: ...)'
    metadata JSONB, -- Store reasoning, previous state, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can View and Insert
CREATE POLICY "Admins can view logs"
    ON public.admin_audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can insert logs"
    ON public.admin_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );
