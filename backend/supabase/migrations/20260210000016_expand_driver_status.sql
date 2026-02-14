-- Migration: Expand Driver Application Status Constraint
-- Purpose: Allow lifecycle management states (SUSPENDED, TERMINATED)
-- Timestamp: 20260210000016

-- 1. Drop existing check constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'driver_applications_status_check') THEN
        ALTER TABLE public.driver_applications DROP CONSTRAINT driver_applications_status_check;
    END IF;
END $$;

-- 2. Add new expanded constraint
ALTER TABLE public.driver_applications
ADD CONSTRAINT driver_applications_status_check 
CHECK (status IN (
    'PENDING', 'pending', 
    'APPROVED', 'approved', 
    'REJECTED', 'rejected', 
    'CONTACTED', 'contacted', 
    'CHANGES_REQUESTED', 'changes_requested',
    'SUSPENDED', 'suspended', 
    'TERMINATED', 'terminated',
    'ACTIVE', 'active' -- Added just in case legacy strings remain
));

-- 3. Ensure RLS allows updates to these statuses for admins
-- (Existing policies usually allow UPDATE based on 'true' for authenticated users, which is fine for now)
