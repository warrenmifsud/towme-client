
-- Final Fix for Dispatch Logic

DROP FUNCTION IF EXISTS public.get_available_driver(double precision, double precision, uuid[]);

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
declare
  v_user_location geography(point);
begin
  -- 1. Create a safe geography point from inputs
  -- Use ST_MakePoint + ST_SetSRID (4326) then cast to geography
  v_user_location := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;

  return query
  select
    ds.driver_id,
    -- Return whichever location is valid
    coalesce(ds.location, ST_SetSRID(ST_MakePoint(ds.last_lng, ds.last_lat), 4326)::geography) as location,
    -- Calculate distance
    extensions.st_distance(ds.location, extensions.st_point(p_lng, p_lat)::geography) as distance
  from public.driver_status ds
  where ds.is_online = true
    -- Ensure we filter correctly
    and (p_excluded_ids is null or not (ds.driver_id = any(p_excluded_ids)))
    -- Check for busy status
    and not exists (
      select 1 from public.towing_requests tr
      where tr.driver_id = ds.driver_id
      and tr.status in ('dispatched', 'en_route', 'in_progress', 'accepted')
    )
  -- Order by distance
  order by
    ds.location <-> extensions.st_point(p_lng, p_lat)::geography
  limit 1;
end;
$$ language plpgsql security definer;
