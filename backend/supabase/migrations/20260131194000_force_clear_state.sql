
-- FORCE CLEAR ALL JOBS AND OFFLINE DRIVERS
-- Run this to reset the testing environment safely

UPDATE public.towing_requests 
SET status = 'cancelled' 
WHERE status NOT IN ('completed', 'cancelled');

UPDATE public.driver_status 
SET is_online = false;
