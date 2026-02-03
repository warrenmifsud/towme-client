-- 1. SECURITY DEFINER HELPERS: Use PLPGSQL to prevent inlining and break recursion
create or replace function public.is_admin_or_manager() 
returns boolean as $$
declare
  is_admin boolean;
begin
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() 
    and role in ('admin', 'manager')
  ) into is_admin;
  return is_admin;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.is_staff() 
returns boolean as $$
declare
  is_staff_user boolean;
begin
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() 
    and role in ('admin', 'manager', 'dispatcher')
  ) into is_staff_user;
  return is_staff_user;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.check_is_driver() 
returns boolean as $$
declare
  driver_check boolean;
begin
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() 
    and is_driver = true
  ) into driver_check;
  return driver_check;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. PROFILES: Security Fix (Recursion-Resistant)
drop policy if exists "Admins/Managers can manage all profiles" on public.profiles;
create policy "Admins/Managers can manage all profiles"
on public.profiles for all
using ( (select is_admin_or_manager()) ); -- Subquery helps prevent some optimization quirks

-- 3. DRIVER_STATUS: Stability Fix
drop policy if exists "Drivers can update their own status" on public.driver_status;
drop policy if exists "Drivers can insert their own status" on public.driver_status;
drop policy if exists "Drivers can delete their own status" on public.driver_status;
drop policy if exists "Dispatchers/Admins can manage driver status" on public.driver_status;

create policy "Drivers can insert their own status"
on public.driver_status for insert
with check ( auth.uid() = driver_id );

create policy "Drivers can update their own status"
on public.driver_status for update
using ( auth.uid() = driver_id )
with check ( auth.uid() = driver_id );

create policy "Drivers can delete their own status"
on public.driver_status for delete
using ( auth.uid() = driver_id );

create policy "Dispatchers/Admins can manage driver status"
on public.driver_status for all
using ( (select is_staff()) );

-- 4. TOWING_REQUESTS: Driver Access & Client Safety
drop policy if exists "Drivers can view available and assigned requests" on public.towing_requests;
drop policy if exists "Drivers can accept and update their requests" on public.towing_requests;
drop policy if exists "Clients can update their own requests" on public.towing_requests;

create policy "Drivers can view available and assigned requests"
on public.towing_requests for select
using (
  ((select check_is_driver()) and status = 'pending')
  or (auth.uid() = driver_id)
);

create policy "Drivers can accept and update their requests"
on public.towing_requests for update
using (
  ((select check_is_driver()) and status = 'pending')
  or (auth.uid() = driver_id)
)
with check (
  (auth.uid() = driver_id)
);

create policy "Clients can update their own requests"
on public.towing_requests for update
using ( auth.uid() = client_id )
with check ( auth.uid() = client_id );
