-- Add 'accepted' to request_status enum
-- We use a DO block to ensure it's idempotent even if we can't easily check enum values in one line
DO $$ BEGIN
    ALTER TYPE public.request_status ADD VALUE 'accepted';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
