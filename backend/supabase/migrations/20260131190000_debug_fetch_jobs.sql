-- Relaxing constraints for debugging AND fixing NULL location issue
create or replace function public.get_available_jobs(driver_lat float, driver_long float)
returns setof public.towing_requests as $$
begin
    return query
    select tr.*
    from public.towing_requests tr
    where tr.status = 'pending'
    -- 1. Use scalar fallback if geography is null
    and extensions.st_distance(
        coalesce(tr.pickup_location, extensions.st_point(tr.pickup_long, tr.pickup_lat)::geography), 
        extensions.st_point(driver_long, driver_lat)::geography
    ) <= (coalesce(tr.search_radius_km, 50.0) * 1000); 
end;
$$ language plpgsql security definer;
