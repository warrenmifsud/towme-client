-- Secure function to get application details for editing
-- Only returns data if status is 'changes_requested' (or pending) to prevent scraping approved/rejected data?
-- Actually, 'changes_requested' is the main use case.

CREATE OR REPLACE FUNCTION get_application_details(p_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT row_to_json(da)
    INTO result
    FROM driver_applications da
    WHERE da.id = p_id
    AND da.status IN ('pending', 'changes_requested'); -- Only allow editing if pending or revision needed

    RETURN result;
END;
$$;

-- Allow public access to this RPC (since revisions come via email link to anon user)
GRANT EXECUTE ON FUNCTION get_application_details(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_application_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_application_details(UUID) TO service_role;
