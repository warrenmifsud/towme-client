DO $$ BEGIN
    create type public.vendor_type as enum ('mechanic', 'battery', 'parts');
EXCEPTION WHEN duplicate_object THEN null; END $$;

create table if not exists public.vendors (
    id uuid not null default gen_random_uuid(),
    user_id uuid references auth.users(id) not null,
    business_name text not null,
    type public.vendor_type not null,
    is_open boolean default false,
    subscription_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    constraint vendors_pkey primary key (id),
    constraint vendors_user_id_key unique (user_id)
);

-- RLS Policies
alter table public.vendors enable row level security;

-- Everyone can read vendors (for client app)
DO $$ BEGIN
    create policy "Allow public read access" on public.vendors for select to public using (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Vendors can update their own status
DO $$ BEGIN
    create policy "Allow vendors to update own record" on public.vendors for update to authenticated using (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Only admins/service_role can insert (for now, or we can allow signup)
DO $$ BEGIN
    create policy "Allow insert for authenticated users" on public.vendors for insert to authenticated with check (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
