-- 1. Create price_schedules table
create table if not exists public.price_schedules (
  id uuid default gen_random_uuid() primary key,
  service_id uuid references public.service_categories(id) on delete cascade not null,
  percentage numeric not null, -- e.g., 10.0 for +10%, -5.0 for -5%
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz default now()
);

-- 2. Create view for live pricing
-- This view calculates the current price based on active schedules
create or replace view public.v_live_service_prices as
select 
  sc.id,
  sc.name,
  sc.description,
  sc.icon_name,
  sc.created_at,
  -- Calculate adjusted price: base_price * (1 + sum(percentage)/100)
  -- We coalesce to 0 sum if no schedules match, resulting in multiplier of 1
  (sc.base_price * (1 + coalesce(
    (select sum(ps.percentage) 
     from public.price_schedules ps 
     where ps.service_id = sc.id 
       and now() >= ps.start_time 
       and now() <= ps.end_time),
    0
  ) / 100)) as base_price,
  -- Keep original price accessible if needed
  sc.base_price as original_price
from public.service_categories sc;

-- 3. Grant permissions (assuming anon/authenticated roles need read access)
grant select on public.v_live_service_prices to anon, authenticated, service_role;
grant select, insert, update, delete on public.price_schedules to service_role;
-- (Adjust permissions as per your RLS policies, usually admins operate as authenticated users with specific checks, or service_role in edge functions)
