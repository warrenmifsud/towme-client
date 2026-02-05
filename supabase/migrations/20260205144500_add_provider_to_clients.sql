ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS provider text DEFAULT 'email';
