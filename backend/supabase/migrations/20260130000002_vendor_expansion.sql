-- Create vendor_categories table
create table if not exists public.vendor_categories (
    id uuid default gen_random_uuid() primary key,
    name text not null unique,
    color_hex text default '#f59e0b', -- Default Amber
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create vendor_category_assignments table (Junction table)
create table if not exists public.vendor_category_assignments (
    id uuid default gen_random_uuid() primary key,
    vendor_id uuid references public.vendor_applications(id) on delete cascade,
    category_id uuid references public.vendor_categories(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(vendor_id, category_id)
);

-- Update vendor_applications table
alter table public.vendor_applications 
add column if not exists subscription_agreed boolean default false,
add column if not exists subscription_price text default '8.00';

-- RLS Policies for Categories
alter table public.vendor_categories enable row level security;

-- Allow public read (for registration form and client app)
-- Allow public read (for registration form and client app)
DO $$ BEGIN
    create policy "Allow public read for categories" on public.vendor_categories for select using (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Allow admins (anon/authenticated) to manage categories
DO $$ BEGIN
    create policy "Allow admin all for categories" on public.vendor_categories for all using (true) with check (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- RLS Policies for Assignments
alter table public.vendor_category_assignments enable row level security;

-- Allow public read
DO $$ BEGIN
    create policy "Allow public read for assignments" on public.vendor_category_assignments for select using (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Allow admins/vendors to manage assignments
DO $$ BEGIN
    create policy "Allow admin/vendor all for assignments" on public.vendor_category_assignments for all using (true) with check (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;
