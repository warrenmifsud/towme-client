
-- 1. Create Platform Settings Table
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Only Super Admins can SELECT, INSERT, UPDATE, DELETE.
-- Everyone else is denied by default.

CREATE POLICY "Super Admins can manage platform settings"
ON public.platform_settings
FOR ALL
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- 4. Seed Default Data (Bypass RLS for migration)
INSERT INTO public.platform_settings (key, value, description)
VALUES ('default_commission', '15.0'::jsonb, 'Default platform commission rate in percent')
ON CONFLICT (key) DO NOTHING;
