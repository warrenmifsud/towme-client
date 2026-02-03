-- 1. Create SUBSCRIPTIONS table
create table if not exists public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  status text not null check (status in ('active', 'inactive', 'canceled', 'trialing')),
  price_id text, -- For Stripe integration later
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Add RLS
alter table public.subscriptions enable row level security;

DO $$ BEGIN
    create policy "Users can view their own subscription" on subscriptions for select using ( auth.uid() = user_id );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Initial policy for manual/mock updates (development)
DO $$ BEGIN
    create policy "Allow public updates for dev" on subscriptions for all using ( true ) with check ( true );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. Trigger to create inactive subscription on user signup
create or replace function public.handle_new_subscription()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, status)
  values (new.id, 'inactive')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_subscription on auth.users;

create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute procedure public.handle_new_subscription();
