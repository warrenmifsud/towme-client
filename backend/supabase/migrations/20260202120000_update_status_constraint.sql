-- Add rejection_reason if missing (safety check)
ALTER TABLE public.driver_applications
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Drop the old constraint
ALTER TABLE public.driver_applications
DROP CONSTRAINT IF EXISTS driver_applications_status_check;

-- Add the new constraint with 'changes_requested'
ALTER TABLE public.driver_applications
ADD CONSTRAINT driver_applications_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'contacted', 'changes_requested'));
