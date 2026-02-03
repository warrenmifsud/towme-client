-- FIX: Update get_available_driver to use scalar coordinates if geography is null
-- Drop first to allow type changes
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
begin
  return query
  select 
    ds.driver_id,
    -- Use fallback location
    coalesce(ds.location, extensions.st_point(ds.last_lng, ds.last_lat)::geography) as location,
    extensions.st_distance(
        coalesce(ds.location, extensions.st_point(ds.last_lng, ds.last_lat)::geography), 
        extensions.st_point(p_lng, p_lat)::geography
    ) as distance
  from public.driver_status ds
  where ds.is_online = true
    -- Ensure we actually have coordinates to calculate distance
    and (ds.location is not null or (ds.last_lat is not null and ds.last_lng is not null))
    -- Exclude drivers who already rejected this specific job
    and (p_excluded_ids is null or not (ds.driver_id = any(p_excluded_ids)))
    -- Exclude drivers who are currently BUSY
    and not exists (
      select 1 from public.towing_requests tr 
      where tr.driver_id = ds.driver_id 
      and tr.status in ('dispatched', 'en_route', 'in_progress', 'accepted')
    )
  order by 
    coalesce(ds.location, extensions.st_point(ds.last_lng, ds.last_lat)::geography) <-> extensions.st_point(p_lng, p_lat)::geography
  limit 1;
end;
$$ language plpgsql security definer;
