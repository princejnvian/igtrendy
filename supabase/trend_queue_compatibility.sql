-- IGTrendy trend queue + admin RLS compatibility fix
-- Run once in Supabase SQL Editor. This lets the authenticated admin account
-- manage trend_queue without relying on the service-role key in the browser/API.

create table if not exists public.trend_queue (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  slug text unique not null,
  category text not null default 'Trending',
  why_now text not null default '',
  status text not null default 'queued' check (status in ('queued','drafted','published','ignored')),
  created_at timestamptz not null default now()
);

alter table public.trend_queue add column if not exists trend_score integer not null default 50;
alter table public.trend_queue add column if not exists source_urls jsonb not null default '[]'::jsonb;
alter table public.trend_queue add column if not exists scanned_at timestamptz;

create unique index if not exists trend_queue_slug_unique_idx on public.trend_queue(slug);
create index if not exists trend_queue_status_score_idx on public.trend_queue(status, trend_score desc, scanned_at desc);

alter table public.trend_queue enable row level security;

-- Only an authenticated IGTrendy admin can read/write the private trend queue.
drop policy if exists "igtrendy admins can read trend queue" on public.trend_queue;
create policy "igtrendy admins can read trend queue"
on public.trend_queue for select to authenticated
using (public.is_igtrendy_admin());

drop policy if exists "igtrendy admins can insert trend queue" on public.trend_queue;
create policy "igtrendy admins can insert trend queue"
on public.trend_queue for insert to authenticated
with check (public.is_igtrendy_admin());

drop policy if exists "igtrendy admins can update trend queue" on public.trend_queue;
create policy "igtrendy admins can update trend queue"
on public.trend_queue for update to authenticated
using (public.is_igtrendy_admin())
with check (public.is_igtrendy_admin());

drop policy if exists "igtrendy admins can delete trend queue" on public.trend_queue;
create policy "igtrendy admins can delete trend queue"
on public.trend_queue for delete to authenticated
using (public.is_igtrendy_admin());

grant select, insert, update, delete on public.trend_queue to authenticated;

-- The manual scanner also needs to read its admin-only daily usage counter.
alter table public.ai_usage_daily enable row level security;
drop policy if exists "igtrendy admins can read ai usage" on public.ai_usage_daily;
create policy "igtrendy admins can read ai usage"
on public.ai_usage_daily for select to authenticated
using (public.is_igtrendy_admin());
grant select on public.ai_usage_daily to authenticated;

-- Allow the authenticated admin to increment usage through the existing
-- SECURITY DEFINER function, while preventing non-admin accounts from doing so.
create or replace function public.record_ai_usage(p_kind text)
returns public.ai_usage_daily
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.ai_usage_daily;
begin
  if not public.is_igtrendy_admin() then
    raise exception 'Not authorized';
  end if;

  insert into public.ai_usage_daily (usage_date)
  values (current_date)
  on conflict (usage_date) do nothing;

  if p_kind = 'trend_scan' then
    update public.ai_usage_daily
    set trend_scan_count = trend_scan_count + 1, updated_at = now()
    where usage_date = current_date;
  elsif p_kind = 'article' then
    update public.ai_usage_daily
    set article_count = article_count + 1, updated_at = now()
    where usage_date = current_date;
  elsif p_kind = 'image' then
    update public.ai_usage_daily
    set image_count = image_count + 1, updated_at = now()
    where usage_date = current_date;
  else
    raise exception 'Unknown AI usage kind: %', p_kind;
  end if;

  select * into r from public.ai_usage_daily where usage_date = current_date;
  return r;
end;
$$;

revoke all on function public.record_ai_usage(text) from public;
grant execute on function public.record_ai_usage(text) to authenticated;
grant execute on function public.record_ai_usage(text) to service_role;
