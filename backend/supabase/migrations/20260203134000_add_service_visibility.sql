-- Ensure all existing categories are active by default if they were null
update public.service_categories set is_active = true where is_active is null;

-- Use DROP VIEW + CREATE to handle column changes safely
drop view if exists public.v_live_service_prices;

create view public.v_live_service_prices as
select 
  sc.id,
  sc.name,
  sc.description,
  sc.icon_name,
  sc.is_active,
  sc.created_at,
  -- Calculate adjusted price: base_price * (1 + sum(percentage)/100)
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

-- Restore permissions
grant select on public.v_live_service_prices to anon, authenticated, service_role;
