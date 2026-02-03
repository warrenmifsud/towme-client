-- Create vendor_applications table
create table if not exists public.vendor_applications (
    id uuid default gen_random_uuid() primary key,
    business_legal_name text not null,
    representative_name text not null,
    shop_name text not null,
    shop_address text not null,
    shop_lat float,
    shop_long float,
    business_summary text,
    email text not null, -- Required for contact
    status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.vendor_applications enable row level security;

-- Allow anyone (public/anon) to submit an application
-- Allow anyone (public/anon) to submit an application
DO $$ BEGIN
    create policy "Allow public insert for applications" on public.vendor_applications for insert with check (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Allow admins (authenticated) to view and update applications
-- ...

DO $$ BEGIN
    create policy "Allow anon read for applications" on public.vendor_applications for select to anon using (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    create policy "Allow anon update for applications" on public.vendor_applications for update to anon using (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;
