-- IGTrendy: make the admin account
-- Run this AFTER the Supabase Auth user already exists.
-- Admin authorization is stored in auth.users.raw_app_meta_data, not profiles.role.

update auth.users
set raw_app_meta_data = jsonb_set(
  coalesce(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb,
  true
)
where lower(email) = lower('princejnvian@gmail.com');

-- Verify
select
  id as user_id,
  email,
  raw_app_meta_data ->> 'role' as admin_role
from auth.users
where lower(email) = lower('princejnvian@gmail.com');
