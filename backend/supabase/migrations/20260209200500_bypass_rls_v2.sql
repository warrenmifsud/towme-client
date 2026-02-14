
BEGIN;

-- Towing Requests: Allow Anon Insert (and Select/Update for test verification)
-- Note: driver_status was handled in previous file, but we can re-ensure or just add towing_requests here.

DROP POLICY IF EXISTS "Temp Allow Anon Towing Requests" ON public.towing_requests;
CREATE POLICY "Temp Allow Anon Towing Requests"
    ON public.towing_requests
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

COMMIT;
