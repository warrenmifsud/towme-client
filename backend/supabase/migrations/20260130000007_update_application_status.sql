-- Update vendor_applications check constraint to include 'changes_requested'
ALTER TABLE public.vendor_applications 
DROP CONSTRAINT vendor_applications_status_check;

ALTER TABLE public.vendor_applications 
ADD CONSTRAINT vendor_applications_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested'));
