-- IGTrendy auth/profile setup
-- Creates a public profile automatically whenever a new Supabase Auth user signs up.
-- The username is taken from user metadata; a unique fallback is generated if needed.

create or replace function public.handle_new_igtrendy_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_username text;
  safe_username text;
begin
  desired_username := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', ''), '[^a-zA-Z0-9_]', '', 'g'));

  if length(desired_username) < 3 then
    desired_username := 'user_' || substring(replace(new.id::text, '-', '') from 1 for 10);
  end if;

  safe_username := desired_username;

  if exists (select 1 from public.profiles where username = safe_username) then
    safe_username := desired_username || '_' || substring(replace(new.id::text, '-', '') from 1 for 6);
  end if;

  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    safe_username,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_igtrendy_user() from public;

 drop trigger if exists on_auth_user_created_igtrendy on auth.users;
create trigger on_auth_user_created_igtrendy
  after insert on auth.users
  for each row execute function public.handle_new_igtrendy_user();
