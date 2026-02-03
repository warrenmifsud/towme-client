-- Add accepted_at column to towing_requests to track when a driver accepts a job
ALTER TABLE public.towing_requests 
ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
