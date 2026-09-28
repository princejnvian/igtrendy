-- IGTrendy Trend Scanner + AI cost safety migration
-- Run this AFTER rebuild_media_platform.sql and admin_setup.sql.

alter table public.trend_queue add column if not exists trend_score integer not null default 50;
alter table public.trend_queue add column if not exists source_urls jsonb not null default '[]'::jsonb;
alter table public.trend_queue add column if not exists scanned_at timestamptz;

create table if not exists public.ai_usage_daily (
  usage_date date primary key default current_date,
  trend_scan_count integer not null default 0,
  article_count integer not null default 0,
  image_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.record_ai_usage(p_kind text)
returns public.ai_usage_daily
language plpgsql
security definer
set search_path = public
as $$
declare r public.ai_usage_daily;
begin
  insert into public.ai_usage_daily(usage_date) values(current_date)
  on conflict(usage_date) do nothing;
  if p_kind = 'trend_scan' then
    update public.ai_usage_daily set trend_scan_count=trend_scan_count+1,updated_at=now() where usage_date=current_date;
  elsif p_kind = 'article' then
    update public.ai_usage_daily set article_count=article_count+1,updated_at=now() where usage_date=current_date;
  elsif p_kind = 'image' then
    update public.ai_usage_daily set image_count=image_count+1,updated_at=now() where usage_date=current_date;
  else raise exception 'Unknown AI usage kind'; end if;
  select * into r from public.ai_usage_daily where usage_date=current_date;
  return r;
end;
$$;

revoke all on function public.record_ai_usage(text) from public;
grant execute on function public.record_ai_usage(text) to service_role;

alter table public.ai_usage_daily enable row level security;

-- Optional limits are environment-controlled by the server:
-- DAILY_TREND_SCAN_LIMIT=2
-- DAILY_ARTICLE_LIMIT=5
-- DAILY_IMAGE_LIMIT=5
