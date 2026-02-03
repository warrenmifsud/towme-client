-- RPC to find nearest online drivers using PostGIS
drop function if exists public.get_nearest_online_drivers(float, float, int);
create or replace function public.get_nearest_online_drivers(lat float, lng float, lim int default 1)
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
    extensions.st_distance(ds.location, extensions.st_point(lng, lat)::geography) as distance
  from public.driver_status ds
  where ds.is_online = true
  order by ds.location <-> extensions.st_point(lng, lat)::geography
  limit lim;
end;
$$ language plpgsql security definer;
