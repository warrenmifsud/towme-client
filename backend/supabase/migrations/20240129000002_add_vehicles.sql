-- 1. Create VEHICLES table
create table if not exists public.vehicles (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references profiles(id) not null,
  make text not null,
  model text not null,
  year text,
  color text,
  license_plate text,
  created_at timestamptz default now()
);

-- 2. Add RLS to Vehicles
alter table public.vehicles enable row level security;

DO $$ BEGIN
    create policy "Users can manage their own vehicles" on vehicles for all using ( auth.uid() = client_id ) with check ( auth.uid() = client_id );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Update TOWING_REQUESTS to link to a vehicle
DO $$ BEGIN
    alter table public.towing_requests add column vehicle_id uuid references vehicles(id);
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Optional: Add policy for admin to see vehicles involved in requests
DO $$ BEGIN
    create policy "Admins can view all vehicles" on vehicles for select using ( exists ( select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'manager', 'dispatcher') ));
EXCEPTION WHEN duplicate_object THEN null; END $$;
