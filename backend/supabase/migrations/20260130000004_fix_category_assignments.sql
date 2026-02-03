-- Drop the old table that linked to vendor_applications
drop table if exists public.vendor_category_assignments;

-- Create vendor_category_assignments table linking to VENDORS (active)
create table if not exists public.vendor_category_assignments (
    id uuid default gen_random_uuid() primary key,
    vendor_id uuid references public.vendors(id) on delete cascade,
    category_id uuid references public.vendor_categories(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(vendor_id, category_id)
);

-- RLS Policies for Assignments
alter table public.vendor_category_assignments enable row level security;

-- Allow public read (so clients can see what categories a vendor has)
create policy "Allow public read for assignments"
    on public.vendor_category_assignments for select
    using (true);

-- Allow vendors to insert their own assignments
create policy "Allow vendors to insert own assignments"
    on public.vendor_category_assignments for insert
    to authenticated
    with check (
        exists (
            select 1 from public.vendors isv
            where isv.id = vendor_category_assignments.vendor_id
            and isv.user_id = auth.uid()
        )
    );

-- Allow vendors to delete their own assignments
create policy "Allow vendors to delete own assignments"
    on public.vendor_category_assignments for delete
    to authenticated
    using (
        exists (
            select 1 from public.vendors isv
            where isv.id = vendor_category_assignments.vendor_id
            and isv.user_id = auth.uid()
        )
    );
