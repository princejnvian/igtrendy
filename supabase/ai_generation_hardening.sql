-- Hardening for reliable AI publishing.
-- Safe to run more than once.
create table if not exists public.web_stories (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles(id) on delete cascade,
  title text not null,
  slides jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.web_stories enable row level security;

drop policy if exists "published web stories are public" on public.web_stories;
create policy "published web stories are public"
on public.web_stories for select to anon, authenticated
using (status = 'published');

create index if not exists web_stories_status_published_idx
on public.web_stories(status, published_at desc);

-- Keep the daily usage function available to the server-side service role.
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
  insert into public.ai_usage_daily (usage_date) values (current_date)
  on conflict (usage_date) do nothing;

  if p_kind = 'trend_scan' then
    update public.ai_usage_daily set trend_scan_count = trend_scan_count + 1, updated_at = now() where usage_date = current_date;
  elsif p_kind = 'article' then
    update public.ai_usage_daily set article_count = article_count + 1, updated_at = now() where usage_date = current_date;
  elsif p_kind = 'image' then
    update public.ai_usage_daily set image_count = image_count + 1, updated_at = now() where usage_date = current_date;
  else
    raise exception 'Unknown AI usage kind: %', p_kind;
  end if;

  select * into r from public.ai_usage_daily where usage_date = current_date;
  return r;
end;
$$;

revoke all on function public.record_ai_usage(text) from public;
grant execute on function public.record_ai_usage(text) to service_role;
