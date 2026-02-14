-- 1. Add service_preferences to profiles for Driver Toggles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS service_preferences JSONB DEFAULT '{}'::jsonb;

-- 2. Add 'type' to service_categories for Client Filtering
ALTER TABLE public.service_categories 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'towing';

-- Update existing categories to have correct types
-- Assuming standard names, update loosely. 
UPDATE public.service_categories SET type = 'towing' WHERE name ILIKE '%tow%' OR name ILIKE '%flatbed%' OR name ILIKE '%winch%';
UPDATE public.service_categories SET type = 'roadside' WHERE name ILIKE '%tire%' OR name ILIKE '%jump%' OR name ILIKE '%fuel%' OR name ILIKE '%lockout%' OR name ILIKE '%battery%';

-- 3. Update the VIEW to include the new column
DROP VIEW IF EXISTS public.v_live_service_prices;

CREATE VIEW public.v_live_service_prices AS
SELECT 
  sc.id,
  sc.name,
  sc.description,
  sc.icon_name,
  sc.is_active,
  sc.type, -- Added column
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
FROM public.service_categories sc;

-- Restore permissions
GRANT SELECT ON public.v_live_service_prices TO anon, authenticated, service_role;
