-- Run after profiles.sql
-- Stores subscription snapshot for each user.

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'inactive' check (status in ('active', 'inactive', 'expired', 'cancelled')),
  plan_code text not null default 'free',
  provider text not null default 'revenuecat',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_status_idx on public.subscriptions(status);
create index if not exists subscriptions_plan_code_idx on public.subscriptions(plan_code);

create or replace function public.set_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute procedure public.set_subscriptions_updated_at();

alter table public.subscriptions enable row level security;

drop policy if exists "Users can view own subscription" on public.subscriptions;
create policy "Users can view own subscription"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own subscription" on public.subscriptions;
create policy "Users can insert own subscription"
  on public.subscriptions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own subscription" on public.subscriptions;
create policy "Users can update own subscription"
  on public.subscriptions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
