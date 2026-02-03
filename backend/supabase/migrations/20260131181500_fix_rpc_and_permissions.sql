-- 1. FIX: get_nearest_online_drivers to return GeoJSON
DROP FUNCTION IF EXISTS public.get_nearest_online_drivers(float, float, int);
create or replace function public.get_nearest_online_drivers(lat float, lng float, lim int default 1)
returns table (
  driver_id uuid,
  location jsonb, -- Changed to JSONB for frontend consumption
  distance float
) as $$
begin
  return query
  select 
    ds.driver_id,
    extensions.st_asgeojson(ds.location)::jsonb as location,
    extensions.st_distance(ds.location, extensions.st_point(lng, lat)::geography) as distance
  from public.driver_status ds
  where ds.is_online = true
  order by ds.location <-> extensions.st_point(lng, lat)::geography
  limit lim;
end;
$$ language plpgsql security definer;

-- 2. FIX: get_available_driver to return GeoJSON
DROP FUNCTION IF EXISTS public.get_available_driver(float, float, uuid[]);
create or replace function public.get_available_driver(
  p_lat float, 
  p_lng float, 
  p_excluded_ids uuid[]
)
returns table (
  driver_id uuid,
  location jsonb, -- Changed to JSONB
  distance float
) as $$
begin
  return query
  select 
    ds.driver_id,
    extensions.st_asgeojson(ds.location)::jsonb as location,
    extensions.st_distance(ds.location, extensions.st_point(p_lng, p_lat)::geography) as distance
  from public.driver_status ds
  where ds.is_online = true
    -- Exclude drivers who already rejected this specific job
    and (p_excluded_ids is null or not (ds.driver_id = any(p_excluded_ids)))
    -- Exclude drivers who are currently BUSY
    and not exists (
      select 1 from public.towing_requests tr 
      where tr.driver_id = ds.driver_id 
      and tr.status in ('dispatched', 'en_route', 'in_progress', 'accepted')
    )
  order by ds.location <-> extensions.st_point(p_lng, p_lat)::geography
  limit 1;
end;
$$ language plpgsql security definer;

-- 3. ENSURE: dispatch_job exists (Re-applying to fix 404)
create or replace function public.dispatch_job(p_request_id uuid)
returns jsonb as $$
declare
  v_request record;
  v_driver record;
begin
  select * into v_request from public.towing_requests where id = p_request_id;
  
  if not found then
    return jsonb_build_object('success', false, 'message', 'Request not found');
  end if;

  select * into v_driver from public.get_available_driver(
    v_request.pickup_lat, 
    v_request.pickup_long, 
    v_request.rejected_driver_ids
  );

  if v_driver.driver_id is not null then
    update public.towing_requests
    set 
      driver_id = v_driver.driver_id,
      status = 'dispatched',
      updated_at = now()
    where id = p_request_id;
    
    return jsonb_build_object('success', true, 'status', 'dispatched', 'driver_id', v_driver.driver_id);
  else
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

-- 4. ENSURE: reject_job exists
create or replace function public.reject_job(p_request_id uuid, p_driver_id uuid)
returns jsonb as $$
begin
  update public.towing_requests
  set 
    rejected_driver_ids = array_append(coalesce(rejected_driver_ids, array[]::uuid[]), p_driver_id),
    driver_id = null,
    status = 'pending'
  where id = p_request_id;

  return public.dispatch_job(p_request_id);
end;
$$ language plpgsql security definer;

-- 5. FIX: Payments Permission (Fix 403)
-- 5. FIX: Payments Permission (Fix 403)
DO $$ BEGIN
    create policy "Users can insert their own payments"
    on public.payments for insert
    to authenticated
    with check (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    create policy "Users can view their own payments"
    on public.payments for select
    to authenticated
    using (
      exists (
        select 1 from public.towing_requests tr
        where tr.id = payments.request_id
        and tr.client_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
