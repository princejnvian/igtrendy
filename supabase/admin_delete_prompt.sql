-- IGTrendy admin-only published prompt removal
-- Run this once in the IGTrendy Supabase SQL Editor.

create or replace function public.admin_delete_prompt(
  p_prompt_id uuid
)
returns public.prompts
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  deleted_prompt public.prompts;
begin
  if not public.is_igtrendy_admin() then
    raise exception 'Not authorized';
  end if;

  delete from public.prompts
  where id = p_prompt_id
  returning * into deleted_prompt;

  if deleted_prompt.id is null then
    raise exception 'Prompt not found';
  end if;

  return deleted_prompt;
end;
$$;

revoke all on function public.admin_delete_prompt(uuid) from public;
grant execute on function public.admin_delete_prompt(uuid) to authenticated;
