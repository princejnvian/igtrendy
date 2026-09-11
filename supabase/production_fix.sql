-- IGTrendy production database fix
-- IMPORTANT: ChatGPT does NOT execute this on your Supabase project.
-- Run this SQL yourself in the current IGTrendy Supabase SQL Editor.

-- 1) Categories must be readable by anonymous/logged-in visitors.
-- Without this policy, the homepage and upload category dropdown can fail
-- with a table-permission/RLS error.
drop policy if exists "categories are public" on public.categories;
create policy "categories are public"
on public.categories
for select
to anon, authenticated
using (true);

-- 2) Admin check reads the authoritative app_metadata directly from auth.users.
-- This avoids a stale browser JWT making the Admin Panel button disappear.
create or replace function public.is_igtrendy_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and coalesce(u.raw_app_meta_data ->> 'role', 'user') = 'admin'
  );
$$;

revoke all on function public.is_igtrendy_admin() from public;
grant execute on function public.is_igtrendy_admin() to authenticated;
