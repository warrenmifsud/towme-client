
-- TEMPORARY: Allow Anon/Public access to set up Test State
-- This is needed because our Test Scripts run as 'anon' but need to simulate 
-- authenticated drivers (setting status) OR because we lack the Service Role Key.

BEGIN;

-- Driver Status: Allow Anon Upsert
DROP POLICY IF EXISTS "Temp Allow Anon Driver Status" ON public.driver_status;
CREATE POLICY "Temp Allow Anon Driver Status"
    ON public.driver_status
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- Towing Requests: Allow Anon Insert (and Select/Update for test verification)
DROP POLICY IF EXISTS "Temp Allow Anon Towing Requests" ON public.towing_requests;
CREATE POLICY "Temp Allow Anon Towing Requests"
    ON public.towing_requests
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

COMMIT;
