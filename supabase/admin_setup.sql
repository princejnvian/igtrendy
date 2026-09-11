-- IGTrendy Admin Moderation Setup
-- Run this AFTER your existing IGTrendy database schema.
-- Admin authorization uses auth.users.app_metadata, not user-editable metadata.

create or replace function public.is_igtrendy_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

revoke all on function public.is_igtrendy_admin() from public;
grant execute on function public.is_igtrendy_admin() to authenticated;

create or replace function public.admin_pending_prompts()
returns table (
  id uuid,
  title text,
  prompt_text text,
  image_url text,
  status text,
  created_at timestamptz,
  creator_id uuid,
  creator_username text,
  creator_full_name text,
  category_id bigint,
  category_name text,
  category_slug text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.title,
    p.prompt_text,
    p.image_url,
    p.status,
    p.created_at,
    p.creator_id,
    pr.username,
    pr.full_name,
    p.category_id,
    c.name,
    c.slug
  from public.prompts p
  left join public.profiles pr on pr.id = p.creator_id
  left join public.categories c on c.id = p.category_id
  where p.status = 'pending'
    and public.is_igtrendy_admin();
$$;

revoke all on function public.admin_pending_prompts() from public;
grant execute on function public.admin_pending_prompts() to authenticated;

create or replace function public.admin_moderate_prompt(
  p_prompt_id uuid,
  p_action text
)
returns public.prompts
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_prompt public.prompts;
  new_status text;
begin
  if not public.is_igtrendy_admin() then
    raise exception 'Not authorized';
  end if;

  if p_action not in ('publish', 'reject') then
    raise exception 'Invalid moderation action';
  end if;

  new_status := case when p_action = 'publish' then 'published' else 'rejected' end;

  update public.prompts
  set
    status = new_status,
    published_at = case
      when new_status = 'published' then coalesce(published_at, now())
      else published_at
    end
  where id = p_prompt_id
    and status = 'pending'
  returning * into updated_prompt;

  if updated_prompt.id is null then
    raise exception 'Prompt not found or already moderated';
  end if;

  return updated_prompt;
end;
$$;

revoke all on function public.admin_moderate_prompt(uuid, text) from public;
grant execute on function public.admin_moderate_prompt(uuid, text) to authenticated;

-- ============================================================
-- MAKE YOUR ACCOUNT ADMIN
-- Replace the email below with the email of your IGTrendy admin account.
-- Run this once, then sign out and sign in again in the website.
-- ============================================================

-- update auth.users
-- set raw_app_meta_data = jsonb_set(
--   coalesce(raw_app_meta_data, '{}'::jsonb),
--   '{role}',
--   '"admin"'::jsonb,
--   true
-- )
-- where email = 'YOUR-ADMIN-EMAIL@example.com';
