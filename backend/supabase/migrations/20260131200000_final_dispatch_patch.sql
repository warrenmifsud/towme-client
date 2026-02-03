-- FINAL DISPATCH PATCH (Consolidated)
-- This migration ensures ALL columns and logic needed for premium dispatch are present.

-- 1. Ensure Table Columns exist
ALTER TABLE public.towing_requests 
ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
ADD COLUMN IF NOT EXISTS rejected_driver_ids uuid[] DEFAULT ARRAY[]::uuid[],
ADD COLUMN IF NOT EXISTS pickup_lat float,
ADD COLUMN IF NOT EXISTS pickup_long float,
ADD COLUMN IF NOT EXISTS pickup_location geography(POINT);

-- 2. Final Hardened get_available_driver
CREATE OR REPLACE FUNCTION public.get_available_driver(
  p_lat float, 
  p_lng float, 
  p_excluded_ids uuid[]
)
RETURNS TABLE (
  driver_id uuid,
  location geography(point),
  distance float
) AS $$
DECLARE
  v_user_location geography(point);
BEGIN
  v_user_location := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;

  RETURN QUERY
  SELECT 
    ds.driver_id,
    COALESCE(ds.location, ST_SetSRID(ST_MakePoint(ds.last_lng, ds.last_lat), 4326)::geography) AS location,
    ST_DISTANCE(
        COALESCE(ds.location, ST_SetSRID(ST_MakePoint(ds.last_lng, ds.last_lat), 4326)::geography), 
        v_user_location
    ) AS distance
  FROM public.driver_status ds
  WHERE ds.is_online = true
    -- Ensure driver has some coordinates
    AND (ds.location IS NOT NULL OR (ds.last_lat IS NOT NULL AND ds.last_lng IS NOT NULL))
    -- Exclude rejections
    AND (p_excluded_ids IS NULL OR NOT (ds.driver_id = ANY(p_excluded_ids)))
    -- Check for busy status (Wait 45s for dispatched offers to expire if not accepted)
    AND NOT EXISTS (
      SELECT 1 FROM public.towing_requests tr 
      WHERE tr.driver_id = ds.driver_id 
      AND (
        tr.status IN ('en_route', 'in_progress', 'accepted')
        OR (tr.status = 'dispatched' AND tr.updated_at > (now() - interval '45 seconds'))
      )
    )
  ORDER BY 
    COALESCE(ds.location, ST_SetSRID(ST_MakePoint(ds.last_lng, ds.last_lat), 4326)::geography) <-> v_user_location
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Final Hardened dispatch_job
CREATE OR REPLACE FUNCTION public.dispatch_job(p_request_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_request record;
  v_driver record;
  v_lat float;
  v_lng float;
BEGIN
  SELECT * INTO v_request FROM public.towing_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Request not found');
  END IF;

  -- Extract coords
  v_lat := COALESCE(v_request.pickup_lat, ST_Y(v_request.pickup_location::geometry));
  v_lng := COALESCE(v_request.pickup_long, ST_X(v_request.pickup_location::geometry));

  IF v_lat IS NULL OR v_lng IS NULL THEN
     RETURN jsonb_build_object('success', false, 'message', 'Missing pickup coordinates');
  END IF;

  -- Find nearest available driver
  SELECT * INTO v_driver FROM public.get_available_driver(
    v_lat, 
    v_lng, 
    v_request.rejected_driver_ids
  );

  IF v_driver.driver_id IS NOT NULL THEN
    UPDATE public.towing_requests
    SET 
      driver_id = v_driver.driver_id,
      status = 'dispatched',
      dispatched_at = now(),
      updated_at = now()
    WHERE id = p_request_id;
    
    RETURN jsonb_build_object('success', true, 'status', 'dispatched', 'driver_id', v_driver.driver_id);
  ELSE
    RETURN jsonb_build_object('success', false, 'status', 'pending', 'message', 'No available drivers nearby (checked 45s stale window)');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
