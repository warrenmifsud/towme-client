-- Add plan_id to subscription_offers
ALTER TABLE public.subscription_offers 
ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.subscription_plans(id);

-- Optional: If an offer has no plan_id, it applies to all plans
COMMENT ON COLUMN public.subscription_offers.plan_id IS 'If NULL, offer applies to all plans. Otherwise, specifically for this plan.';
