-- Migration: TowMe Operational Engine (Elite Task Force Deployment)
-- Date: 2026-02-10
-- Purpose: Structural Onboarding, Fleet Hierarchy, and Dynamic Financials

-- 1. FLEETS TABLE
create table if not exists public.fleets (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  owner_id uuid references public.profiles(id) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: Fleets
alter table public.fleets enable row level security;

create policy "Fleet Managers view their own fleet" 
  on public.fleets for select 
  using ( auth.uid() = owner_id );

create policy "Admins view all fleets" 
  on public.fleets for all 
  using ( 
    exists ( 
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role in ('super_admin', 'admin', 'dispatcher') 
    ) 
  );

-- 2. PROFILES UPDATES (Hierarchy)
alter table public.profiles 
add column if not exists fleet_id uuid references public.fleets(id),
add column if not exists is_fleet_manager boolean default false;

-- 3. FLEET ASSETS TABLE (Vehicles attached to a fleet)
create table if not exists public.fleet_assets (
  id uuid default uuid_generate_v4() primary key,
  fleet_id uuid references public.fleets(id) not null,
  driver_id uuid references public.profiles(id), -- Optional assignment
  
  -- Vehicle Data
  make text not null,
  model text not null,
  license_plate text not null,
  vin text,
  
  -- Guardrail
  is_verified boolean default false,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: Fleet Assets (Invisible Map Guard)
alter table public.fleet_assets enable row level security;

-- "Invisible Map Guard": Public/Map API can ONLY see verified assets
create policy "Public/Map view verified assets only" 
  on public.fleet_assets for select 
  using ( is_verified = true );

create policy "Fleet Managers view own assets" 
  on public.fleet_assets for all 
  using ( 
    exists ( 
      select 1 from public.fleets 
      where fleets.id = fleet_assets.fleet_id 
      and fleets.owner_id = auth.uid() 
    ) 
  );

create policy "Admins view all assets" 
  on public.fleet_assets for all 
  using ( 
    exists ( 
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role in ('super_admin', 'admin', 'dispatcher') 
    ) 
  );

-- 4. DRIVER STATUS UPDATES (Financials)
alter table public.driver_status
add column if not exists partner_commission_rate decimal(5,2) default 15.00, -- e.g. 15.00 for 15%
add column if not exists hourly_rate decimal(10,2) default 0.00;

-- Comment for documentation
COMMENT ON COLUMN public.driver_status.partner_commission_rate IS 'Custom commission rate override for partner drivers (default 15.00%).';
COMMENT ON COLUMN public.driver_status.hourly_rate IS 'Hourly rate for wage-based drivers (EUR).';
COMMENT ON COLUMN public.fleet_assets.is_verified IS 'Invisible Map Guard: If false, asset is hidden from public map API.';
