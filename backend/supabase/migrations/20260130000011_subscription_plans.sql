-- Migration: Subscription Plans and Offers
-- Date: 2026-01-30

-- 1. Create SUBSCRIPTION_PLANS table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    price decimal(10,2) NOT NULL,
    description text,
    features text[],
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Subscription plans are viewable by everyone" ON public.subscription_plans FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Only admins can manage subscription plans" ON public.subscription_plans FOR ALL
    USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager') ));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Create SUBSCRIPTION_OFFERS table
CREATE TABLE IF NOT EXISTS public.subscription_offers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    discount_price decimal(10,2) NOT NULL,
    duration_months integer NOT NULL,
    is_active boolean DEFAULT false,
    apply_to_new_users boolean DEFAULT false,
    apply_to_current_users boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_offers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Subscription offers are viewable by everyone" ON public.subscription_offers FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Only admins can manage subscription offers" ON public.subscription_offers FOR ALL
    USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager') ));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Update SUBSCRIPTIONS table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.subscription_plans(id),
ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.subscription_offers(id),
ADD COLUMN IF NOT EXISTS offer_ends_at timestamptz;

-- 4. Seed Initial Plans
INSERT INTO public.subscription_plans (name, price, description, features)
VALUES 
('Vendor Pro Plan', 8.00, 'Full access to vendor portal, get found on our client application.', ARRAY['Vendor Portal Access', 'Client App Visibility']),
('Vendor Pro PLUS', 15.00, 'All Pro features plus premium placement and website availability.', ARRAY['Vendor Portal Access', 'Client App Visibility', 'Premium Placement', 'Website Visibility'])
ON CONFLICT (name) DO UPDATE 
SET price = EXCLUDED.price, 
    description = EXCLUDED.description, 
    features = EXCLUDED.features;

-- 5. Update Existing Subscriptions to 'Vendor Pro Plan'
-- We assume existing users are on the Pro plan
DO $$
DECLARE
    pro_plan_id uuid;
BEGIN
    SELECT id INTO pro_plan_id FROM public.subscription_plans WHERE name = 'Vendor Pro Plan';
    UPDATE public.subscriptions SET plan_id = pro_plan_id WHERE plan_id IS NULL;
END $$;
