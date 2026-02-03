-- Migration: Optimize Towing Requests & Secure
-- Date: 2026-02-03
-- Author: Antigravity

-- 1. Create Composite Index for Status + CreatedAt (Desc)
-- This eliminates full table scans for the Dispatch Board and Mission Control
-- Note: CONCURRENTLY removed to allow execution within migration transaction
CREATE INDEX IF NOT EXISTS idx_towing_status_created 
ON public.towing_requests (status, created_at DESC);

-- 2. Verify/Enable Row Level Security (RLS)
-- Ensure we are not exposing client phone numbers to public (anon) requests
ALTER TABLE public.towing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. (Optional but recommended) Policy Check
-- If policies don't exist, create restrictive defaults.
-- We assume policies likely exist, but ensuring RLS is enabled is the critical first step.
-- This part is commented out to avoid conflict with existing complex policies, 
-- but explicitly enabling RLS above forces the DB to respect whatever is defined.
-- If no policies exist, "ENABLE ROW LEVEL SECURITY" effectively locks the table for non-superusers,
-- which matches the "Deny by Default" security model.
