-- 1. Enable PostGIS for location calculations
create extension if not exists postgis;

-- 2. Update PROFILES for Driver Support
alter table public.profiles 
add column if not exists is_driver boolean default false,
add column if not exists driver_categories uuid[] default '{}';

-- 3. Create DRIVER_STATUS table for real-time tracking
create table if not exists public.driver_status (
  driver_id uuid references public.profiles(id) on delete cascade primary key,
  is_online boolean default false,
  active_categories uuid[] default '{}',
  location geography(point) not null,
  updated_at timestamptz default now()
);

-- RLS: Driver Status
alter table public.driver_status enable row level security;

DO $$ BEGIN
    create policy "Drivers can update their own status" on driver_status for all using ( auth.uid() = driver_id );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    create policy "Everyone can view online drivers" on driver_status for select using ( true );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. Update TOWING_REQUESTS for Advanced Dispatch
-- Add location as geography for better precision and distance math
DO $$ BEGIN
    alter table public.towing_requests add column if not exists pickup_location geography(point);
    alter table public.towing_requests add column if not exists driver_id uuid references public.profiles(id);
    alter table public.towing_requests add column if not exists search_radius_km float default 5.0;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 5. FUNCTION: Match Jobs for Drivers
-- This function will search for pending jobs within a driver's active categories and range
create or replace function public.get_available_jobs(driver_lat float, driver_long float)
returns setof public.towing_requests as $$
declare
    active_driver_cats uuid[];
begin
    -- Get current driver's active categories
    select active_categories into active_driver_cats 
    from public.driver_status 
    where driver_id = auth.uid() and is_online = true;

    return query
    select tr.*
    from public.towing_requests tr
    where tr.status = 'pending'
    and tr.category_id = any(active_driver_cats)
    and extensions.st_distance(tr.pickup_location, extensions.st_point(driver_long, driver_lat)::geography) <= (tr.search_radius_km * 1000);
end;
$$ language plpgsql security definer;
