-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Extends auth.users)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'dispatcher', 'client');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role user_role default 'client',
  avatar_url text, -- For that "Glass" profile look
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: Profiles
alter table public.profiles enable row level security;

DO $$ BEGIN
    create policy "Public profiles are viewable by everyone" on profiles for select using ( true );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    create policy "Users can update own profile" on profiles for update using ( auth.uid() = id );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. SERVICE CATEGORIES (Admin managed)
create table if not exists public.service_categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  base_price decimal(10,2) not null,
  icon_name text, -- SF Symbol name or icon identifier
  is_active boolean default true,
  created_at timestamptz default now()
);

-- RLS: Service Categories
alter table public.service_categories enable row level security;

DO $$ BEGIN
    create policy "Service categories are viewable by everyone" on service_categories for select using ( true );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    create policy "Only Admins/Managers can insert/update categories" on service_categories for all using ( exists ( select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'manager') ));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. TOWING REQUESTS
DO $$ BEGIN
    create type request_status as enum ('pending', 'dispatched', 'en_route', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

create table if not exists public.towing_requests (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references profiles(id) not null,
  category_id uuid references service_categories(id) not null,
  
  -- Location Data
  pickup_lat double precision not null,
  pickup_long double precision not null,
  pickup_address text,
  dropoff_lat double precision,
  dropoff_long double precision,
  dropoff_address text,

  -- Status & AI
  status request_status default 'pending',
  ai_severity_score float, -- AI estimated urgency (0.0 - 1.0)
  estimated_arrival timestamptz,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: Requests
alter table public.towing_requests enable row level security;

DO $$ BEGIN
    create policy "Clients can view their own requests" on towing_requests for select using ( auth.uid() = client_id );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    create policy "Clients can create requests" on towing_requests for insert with check ( auth.uid() = client_id );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    create policy "Dispatchers/Admins can view all requests" on towing_requests for all using ( exists ( select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'manager', 'dispatcher') ));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. PAYMENTS
DO $$ BEGIN
    create type payment_status as enum ('pending', 'succeeded', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

create table if not exists public.payments (
  id uuid default uuid_generate_v4() primary key,
  request_id uuid references towing_requests(id) not null,
  amount decimal(10,2) not null,
  status payment_status default 'pending',
  stripe_payment_intent_id text,
  created_at timestamptz default now()
);

-- RLS: Payments
alter table public.payments enable row level security;

DO $$ BEGIN
    create policy "Clients see their own payments" on payments for select using ( exists ( select 1 from towing_requests where towing_requests.id = payments.request_id and towing_requests.client_id = auth.uid() ));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    create policy "Admins see all payments" on payments for select using ( exists ( select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'manager') ));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Funtion to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'client');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
