-- Function to bulk adjust service prices by a percentage
-- percentage: +10 means increase by 10%, -5 means decrease by 5%

create or replace function public.adjust_service_prices(percentage numeric)
returns void
language plpgsql
security definer
as $$
begin
  update public.service_categories
  set base_price = base_price * (1 + (percentage / 100))
  where id is not null; -- Satisfy safe update requirement
end;
$$;
