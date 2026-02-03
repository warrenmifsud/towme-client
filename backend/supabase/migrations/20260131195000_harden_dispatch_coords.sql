-- 1. Final Hardening for dispatch_job
-- Handles cases where pickup_lat/long might be slightly offset or null (uses pickup_location fallback)
create or replace function public.dispatch_job(p_request_id uuid)
returns jsonb as $$
declare
  v_request record;
  v_driver record;
  v_lat float;
  v_lng float;
begin
  -- Fetch request
  select * into v_request from public.towing_requests where id = p_request_id;
  
  if not found then
    return jsonb_build_object('success', false, 'message', 'Request not found');
  end if;

  -- 1. Extract coordinates (handle nulls by trying to extract from pickup_location geography)
  v_lat := coalesce(v_request.pickup_lat, ST_Y(v_request.pickup_location::geometry));
  v_lng := coalesce(v_request.pickup_long, ST_X(v_request.pickup_location::geometry));

  if v_lat is null or v_lng is null then
     return jsonb_build_object('success', false, 'message', 'Pickup coordinates are missing');
  end if;

  -- 2. Find nearest available driver
  select * into v_driver from public.get_available_driver(
    v_lat, 
    v_lng, 
    v_request.rejected_driver_ids
  );

  if v_driver.driver_id is not null then
    -- Driver FOUND: Assign them
    update public.towing_requests
    set 
      driver_id = v_driver.driver_id,
      status = 'dispatched',
      dispatched_at = now(),
      updated_at = now()
    where id = p_request_id;
    
    return jsonb_build_object('success', true, 'status', 'dispatched', 'driver_id', v_driver.driver_id);
  else
    -- NO Driver Found: Let it stay pending
    return jsonb_build_object('success', false, 'status', 'pending', 'message', 'No available drivers found in vicinity');
  end if;
end;
$$ language plpgsql security definer;
