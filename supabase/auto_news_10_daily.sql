-- IGTrendy automatic global news + 10/day publishing migration.
-- Run once in Supabase SQL Editor.

-- Allow News as a first-class article category.
alter table public.articles drop constraint if exists articles_category_check;
alter table public.articles add constraint articles_category_check check (category in ('Gaming','Movies','Web Series','Events','Theories','Explained','Trending','News'));

-- Allow the scheduler to claim a trend while an article is being generated.
alter table public.trend_queue drop constraint if exists trend_queue_status_check;
alter table public.trend_queue add constraint trend_queue_status_check check (status in ('queued','drafted','processing','published','ignored'));

-- Ensure the service role can use the queue during cron runs.
grant select, insert, update, delete on public.trend_queue to service_role;
grant select, insert, update, delete on public.articles to service_role;

-- The application default is 10 articles/day. An env var can override it.
