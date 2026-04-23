create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now()
);

create table if not exists public.financial_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  monthly_income numeric not null,
  monthly_expenses numeric not null,
  savings numeric not null,
  credit_score_range text not null,
  housing_status text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  balance numeric not null,
  interest_rate numeric not null,
  monthly_payment numeric not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  estimated_value numeric,
  mortgage_balance numeric,
  mortgage_rate numeric,
  rental_income_estimate numeric,
  created_at timestamp with time zone default now()
);

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  payload jsonb not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  window text not null,
  title text not null,
  detail text not null,
  created_at timestamp with time zone default now()
);

alter table public.financial_profiles enable row level security;
alter table public.debts enable row level security;
alter table public.properties enable row level security;
alter table public.scenarios enable row level security;
alter table public.plans enable row level security;
alter table public.users enable row level security;

create policy "Users can manage their profile" on public.financial_profiles for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage debts" on public.debts for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage properties" on public.properties for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage scenarios" on public.scenarios for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage plans" on public.plans for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage users row" on public.users for all
using (auth.uid() = id) with check (auth.uid() = id);
