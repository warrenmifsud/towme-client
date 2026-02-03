-- Add source column to towing_requests (app vs manual)
DO $$ BEGIN
    ALTER TABLE public.towing_requests ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'app' CHECK (source IN ('app', 'manual'));
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Add dispatcher_notes for manual job details
DO $$ BEGIN
    ALTER TABLE public.towing_requests ADD COLUMN IF NOT EXISTS dispatcher_notes TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Add vehicle_details JSONB for manual entries (since we don't have a linked vehicle profile)
DO $$ BEGIN
    ALTER TABLE public.towing_requests ADD COLUMN IF NOT EXISTS vehicle_details JSONB;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Note: client_id is NOT NULL. Dispatchers must use their own ID or a generic 'Walk-in' ID.
-- We will handle this in the frontend by using the current user's ID.
