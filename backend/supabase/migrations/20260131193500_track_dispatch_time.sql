
-- 1. Add dispatched_at to track when the offer was made
ALTER TABLE public.towing_requests 
ADD COLUMN IF NOT EXISTS dispatched_at timestamptz;

-- 2. Update dispatch_job to record the time
create or replace function public.dispatch_job(p_request_id uuid)
returns jsonb as $$
declare
  v_request record;
  v_driver record;
begin
  -- Fetch request
  select * into v_request from public.towing_requests where id = p_request_id;
  
  if not found then
    return jsonb_build_object('success', false, 'message', 'Request not found');
  end if;

  -- Find nearest available driver
  select * into v_driver from public.get_available_driver(
    v_request.pickup_lat, 
    v_request.pickup_long, 
    v_request.rejected_driver_ids
  );

  if v_driver.driver_id is not null then
    -- Driver FOUND: Assign them
    update public.towing_requests
    set 
      driver_id = v_driver.driver_id,
      status = 'dispatched',
      dispatched_at = now(), -- Track the offer time
      updated_at = now()
    where id = p_request_id;
    
    return jsonb_build_object('success', true, 'status', 'dispatched', 'driver_id', v_driver.driver_id);
  else
    -- NO Driver Found
    update public.towing_requests
    set 
      driver_id = null,
      status = 'pending',
      updated_at = now()
    where id = p_request_id;
    
    return jsonb_build_object('success', false, 'status', 'pending', 'message', 'No available drivers found');
  end if;
end;
$$ language plpgsql security definer;
