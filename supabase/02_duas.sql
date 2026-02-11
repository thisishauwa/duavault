-- Run after profiles.sql
-- Stores synced user duas (library items) and favorites.

create extension if not exists pgcrypto;

create table if not exists public.duas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  arabic text not null,
  translation text not null,
  category text not null check (
    category in (
      'Morning/Evening',
      'Travel',
      'Food',
      'Sleep',
      'Protection',
      'Gratitude',
      'General',
      'Other'
    )
  ),
  source text not null check (source in ('screenshot', 'link', 'manual')),
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_duas_user_id on public.duas (user_id);
create index if not exists idx_duas_user_category on public.duas (user_id, category);
create index if not exists idx_duas_user_created_at on public.duas (user_id, created_at desc);
create index if not exists idx_duas_user_favorite on public.duas (user_id, is_favorite);

create or replace function public.set_duas_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_duas_updated_at on public.duas;
create trigger set_duas_updated_at
before update on public.duas
for each row execute procedure public.set_duas_updated_at();

alter table public.duas enable row level security;

drop policy if exists "Users can view own duas" on public.duas;
create policy "Users can view own duas"
  on public.duas
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own duas" on public.duas;
create policy "Users can insert own duas"
  on public.duas
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own duas" on public.duas;
create policy "Users can update own duas"
  on public.duas
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own duas" on public.duas;
create policy "Users can delete own duas"
  on public.duas
  for delete
  using (auth.uid() = user_id);
