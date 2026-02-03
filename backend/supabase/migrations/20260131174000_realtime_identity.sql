-- Hardening Realtime Sync for zero-manual-refresh tracking
ALTER TABLE public.driver_status REPLICA IDENTITY FULL;
ALTER TABLE public.towing_requests REPLICA IDENTITY FULL;

-- Ensure the publication is robust
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE driver_status, towing_requests;
