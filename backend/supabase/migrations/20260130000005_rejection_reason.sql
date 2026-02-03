-- Add rejection_reason column to vendor_applications
alter table public.vendor_applications 
add column if not exists rejection_reason text;
