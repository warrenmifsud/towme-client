-- 1. Fix get_available_driver to ignore STALE dispatches
-- If a driver has a 'dispatched' job that is older than 45 seconds, consider them NOT busy.
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
    -- Driver is BUSY only if they have a non-stale active job
    and not exists (
      select 1 from public.towing_requests tr
      where tr.driver_id = ds.driver_id
      and (
        tr.status in ('en_route', 'in_progress', 'accepted')
        OR (tr.status = 'dispatched' AND tr.updated_at > (now() - interval '45 seconds'))
      )
    )
  order by ds.location <-> extensions.st_point(p_lng, p_lat)::geography
  limit 1;
end;
$$ language plpgsql security definer;

-- 2. Force mark any stale dispatched jobs as pending so they can be re-dispatched
update public.towing_requests
set status = 'pending', driver_id = null
where status = 'dispatched' and updated_at < (now() - interval '45 seconds');
