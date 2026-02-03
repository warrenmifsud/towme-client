-- 1. Add rejected_driver_ids column
alter table public.towing_requests 
add column if not exists rejected_driver_ids uuid[] default array[]::uuid[];

-- 2. Enhanced Driver Search (Excludes rejected & busy drivers)
create or replace function public.get_available_driver(
  p_lat float, 
  p_lng float, 
  p_excluded_ids uuid[]
)
returns table (
  driver_id uuid,
  location geography(point),
  distance float
) as $$
begin
  return query
  select 
    ds.driver_id,
    ds.location,
    extensions.st_distance(ds.location, extensions.st_point(p_lng, p_lat)::geography) as distance
  from public.driver_status ds
  where ds.is_online = true
    -- Exclude drivers who already rejected this specific job
    and (p_excluded_ids is null or not (ds.driver_id = any(p_excluded_ids)))
    -- Exclude drivers who are currently BUSY (have an active job)
    and not exists (
      select 1 from public.towing_requests tr 
      where tr.driver_id = ds.driver_id 
      and tr.status in ('dispatched', 'en_route', 'in_progress', 'accepted')
    )
  order by ds.location <-> extensions.st_point(p_lng, p_lat)::geography
  limit 1;
end;
$$ language plpgsql security definer;

-- 3. Core Dispatch Logic (Finds and assigns)
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
      status = 'dispatched', -- 'dispatched' means "offered to driver"
      updated_at = now()
    where id = p_request_id;
    
    return jsonb_build_object('success', true, 'status', 'dispatched', 'driver_id', v_driver.driver_id);
  else
    -- NO Driver Found
    update public.towing_requests
    set 
      driver_id = null,
      status = 'pending', -- Back to queue
      updated_at = now()
    where id = p_request_id;
    
    return jsonb_build_object('success', false, 'status', 'pending', 'message', 'No available drivers found');
  end if;
end;
$$ language plpgsql security definer;

-- 4. Rejection Handler
create or replace function public.reject_job(p_request_id uuid, p_driver_id uuid)
returns jsonb as $$
begin
  -- 1. Add driver to rejected list
  update public.towing_requests
  set 
    rejected_driver_ids = array_append(coalesce(rejected_driver_ids, array[]::uuid[]), p_driver_id),
    driver_id = null,
    status = 'pending' -- Temporarily set to pending before re-dispatch
  where id = p_request_id;

  -- 2. Immediately try to find the NEXT driver
  return public.dispatch_job(p_request_id);
end;
$$ language plpgsql security definer;
