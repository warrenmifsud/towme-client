-- Migration: Vendor Profile Expansion
-- Date: 2026-01-30

-- 1. Updates to Vendors Table (Live Data)
ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS contact_number text,
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS social_facebook text,
ADD COLUMN IF NOT EXISTS social_instagram text,
ADD COLUMN IF NOT EXISTS business_summary text;

COMMENT ON COLUMN public.vendors.contact_number IS 'Contact number displayed to clients';
COMMENT ON COLUMN public.vendors.website_url IS 'Optional website link';
COMMENT ON COLUMN public.vendors.social_facebook IS 'Optional Facebook profile link';
COMMENT ON COLUMN public.vendors.social_instagram IS 'Optional Instagram profile link';
COMMENT ON COLUMN public.vendors.business_summary IS 'Brief summary of the business displayed on client app';

-- 2. Updates to Vendor Applications Table (Registration Data)
ALTER TABLE public.vendor_applications
ADD COLUMN IF NOT EXISTS contact_number text,
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS social_facebook text,
ADD COLUMN IF NOT EXISTS social_instagram text,
ADD COLUMN IF NOT EXISTS business_summary text;
