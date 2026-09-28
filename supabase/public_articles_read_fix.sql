-- IGTrendy: public + admin article read permissions fix
-- Run once in Supabase SQL Editor.
-- This fixes the situation where AI publishing succeeds but the public site
-- and Admin "Recent articles" show 0 because SELECT grants/RLS are missing.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON TABLE
  public.articles,
  public.article_sources,
  public.web_stories
TO anon, authenticated;

-- Public visitors may read published content.
drop policy if exists "published articles are public" on public.articles;
create policy "published articles are public"
on public.articles
for select
to anon, authenticated
using (status = 'published');

-- Logged-in IGTrendy admins may read drafts and published articles in Studio.
drop policy if exists "admins can read all articles" on public.articles;
create policy "admins can read all articles"
on public.articles
for select
to authenticated
using (public.is_igtrendy_admin());

-- Sources: public can read sources belonging to published articles;
-- admins can read sources for drafts too.
drop policy if exists "published sources are public" on public.article_sources;
create policy "published sources are public"
on public.article_sources
for select
to anon, authenticated
using (
  exists (
    select 1 from public.articles a
    where a.id = article_id and a.status = 'published'
  )
);

drop policy if exists "admins can read all article sources" on public.article_sources;
create policy "admins can read all article sources"
on public.article_sources
for select
to authenticated
using (public.is_igtrendy_admin());

-- Web Stories: public published stories, admins can see drafts too.
drop policy if exists "published web stories are public" on public.web_stories;
create policy "published web stories are public"
on public.web_stories
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "admins can read all web stories" on public.web_stories;
create policy "admins can read all web stories"
on public.web_stories
for select
to authenticated
using (public.is_igtrendy_admin());

-- Verification
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where grantee in ('anon','authenticated')
  and table_schema = 'public'
  and table_name in ('articles','article_sources','web_stories')
order by grantee, table_name, privilege_type;
