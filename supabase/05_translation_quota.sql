-- Run after profiles.sql
-- Tracks free AI translation usage per user/month.

create table if not exists public.translation_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  used_count integer not null default 0 check (used_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

alter table public.translation_usage enable row level security;

drop policy if exists "Users can view own translation usage" on public.translation_usage;
create policy "Users can view own translation usage"
  on public.translation_usage
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own translation usage" on public.translation_usage;
create policy "Users can insert own translation usage"
  on public.translation_usage
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own translation usage" on public.translation_usage;
create policy "Users can update own translation usage"
  on public.translation_usage
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.consume_translation_quota(p_limit integer default 3)
returns table(
  allowed boolean,
  used_count integer,
  remaining integer,
  period_start date
)
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_period_start date := date_trunc('month', now())::date;
  v_used integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update public.translation_usage
  set used_count = used_count + 1,
      updated_at = now()
  where user_id = v_user_id
    and period_start = v_period_start
    and used_count < p_limit
  returning public.translation_usage.used_count into v_used;

  if found then
    return query
      select true, v_used, greatest(p_limit - v_used, 0), v_period_start;
    return;
  end if;

  insert into public.translation_usage (user_id, period_start, used_count, updated_at)
  values (v_user_id, v_period_start, 1, now())
  on conflict (user_id, period_start) do nothing;

  if found then
    return query
      select true, 1, greatest(p_limit - 1, 0), v_period_start;
    return;
  end if;

  select tu.used_count into v_used
  from public.translation_usage tu
  where tu.user_id = v_user_id
    and tu.period_start = v_period_start;

  return query
    select false, coalesce(v_used, p_limit), 0, v_period_start;
end;
$$;
