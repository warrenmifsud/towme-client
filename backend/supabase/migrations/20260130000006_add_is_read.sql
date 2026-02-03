-- Add is_read column to vendor_applications
alter table public.vendor_applications 
add column if not exists is_read boolean default false;
