-- 1. Update DRIVER_STATUS with double precision coordinates for easier map consumption
alter table public.driver_status 
add column if not exists last_lat double precision,
add column if not exists last_lng double precision;

-- 2. Update existing TOWING_REQUESTS to ensure pickup_location is populated if missing but lat/lng exist
-- update public.towing_requests
-- set pickup_location = extensions.st_makepoint(pickup_long, pickup_lat)::geography
-- where pickup_location is null 
-- and pickup_lat is not null 
-- and pickup_long is not null;

-- 3. (Optional) Helpful view for debugging coordinate sync
create or replace view public.v_driver_tracking as
select 
    ds.driver_id,
    p.full_name,
    ds.is_online,
    ds.last_lat,
    ds.last_lng,
    ds.updated_at
from public.driver_status ds
join public.profiles p on p.id = ds.driver_id;
