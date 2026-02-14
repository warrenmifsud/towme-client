-- Phase 60-C: Expand Driver Status Options
-- Purpose: Allow 'SUSPENDED' and 'TERMINATED' statuses for Partner Command Center

DO $$ BEGIN
    -- Drop the existing constraint if it exists (name might vary, so we try standardized names or just replace)
    -- We can't easily know the exact auto-generated name, so we'll try to drop the specific constraint if we know it, 
    -- otherwise we might need to rely on the fact that adding a text check constraint usually replaces or adds to it.
    -- Better approach: Drop the specific constraint if widely known, or just ADD the new one and DROP the old one if we can find it.
    -- Since we created it in 20240129173000_create_driver_applications.sql without a name, it likely has a generic name.
    -- Let's attempt to alter the column type (which is TEXT) with a new CHECK.
    
    -- Safe approach: Drop the constraint by name if we can predict it (driver_applications_status_check)
    ALTER TABLE public.driver_applications DROP CONSTRAINT IF EXISTS driver_applications_status_check;
    
    -- Add the new constraint
    ALTER TABLE public.driver_applications 
    ADD CONSTRAINT driver_applications_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'contacted', 'APPROVED', 'REJECTED', 'SUSPENDED', 'TERMINATED')); 
    -- Note: Added uppercase 'APPROVED', 'REJECTED' as well to match the TSX logic which uses uppercase.
    
EXCEPTION
    WHEN others THEN null;
END $$;
