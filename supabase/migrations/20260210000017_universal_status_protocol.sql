-- UNIVERSAL STATUS PROTOCOL [cite: 2026-02-10]
-- Compliance: Tier-Zero Super-Elite Workforce Mandate

-- 1. Drop Legacy Constraints (Ruthless Elimination)
ALTER TABLE public.driver_applications 
DROP CONSTRAINT IF EXISTS driver_applications_status_check;

-- 2. Apply Universal Status Protocol
-- Recognizing: PENDING, APPROVED, REJECTED, SUSPENDED, TERMINATED, DRAFT, SUBMITTED, ACTIVE
-- Case-insensitive safety net via UPPER/LOWER normalization not possible in CHECK without function, 
-- so we explicitly list both cases to be safe, or just standard canonicals.
-- Mandate lists: 'DRAFT', 'SUBMITTED', 'PENDING', 'ACTIVE'.
-- Existing system uses: 'pending', 'approved', 'rejected' (lowercase in some places, uppercase in others? need to be careful).
-- Best approach: Allow ALL case variants found in codebase + Mandate.

ALTER TABLE public.driver_applications
ADD CONSTRAINT driver_applications_status_check 
CHECK (status IN (
    'pending', 'PENDING',
    'approved', 'APPROVED',
    'rejected', 'REJECTED',
    'suspended', 'SUSPENDED',
    'terminated', 'TERMINATED',
    'draft', 'DRAFT',
    'submitted', 'SUBMITTED',
    'active', 'ACTIVE'
));

-- 3. Security Unit: RLS Policy for Anon Inserts
-- "Ensure the RLS Policy allows anon role inserts"

DROP POLICY IF EXISTS "Allow anon INSERT to driver_applications" ON public.driver_applications;

CREATE POLICY "Allow anon INSERT to driver_applications"
ON public.driver_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 4. Security Unit: RLS Policy for Anon Updates (Draft/Submitted flow)
-- If usage of DRAFT implies multiple steps, they might need update access to their own record?
-- For now, enforcing INSERT access as primary mandate.

-- 5. Verification Metadata
COMMENT ON CONSTRAINT driver_applications_status_check ON public.driver_applications IS 'Universal Status Protocol: DRAFT, SUBMITTED, PENDING, ACTIVE, SUSPENDED, TERMINATED';
