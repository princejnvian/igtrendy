-- IGTrendy production prompt-image storage setup
-- Run this ONCE in the Supabase SQL Editor for the current IGTrendy project.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prompt-images',
  'prompt-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

-- Categories used by the upload form. Existing categories are preserved.
insert into public.categories (name, slug, icon)
values
  ('Viral / Trending', 'viral-trending', '🔥'),
  ('AI Portraits', 'ai-portraits', '🧑'),
  ('Instagram Photos', 'instagram-photos', '📸'),
  ('Cinematic', 'cinematic', '🎬'),
  ('Retro / Vintage', 'retro-vintage', '📻'),
  ('Wedding', 'wedding', '💍'),
  ('Fashion', 'fashion', '👗'),
  ('Professional', 'professional', '💼'),
  ('Anime / Artistic', 'anime-artistic', '🎨'),
  ('Travel', 'travel', '✈️'),
  ('Before / After', 'before-after', '✨'),
  ('Character Creation', 'character-creation', '🧙')
on conflict (name) do update
set slug = excluded.slug, icon = excluded.icon;

-- Public can read images from the public prompt-images bucket.
drop policy if exists "Public can view IGTrendy prompt images" on storage.objects;
create policy "Public can view IGTrendy prompt images"
on storage.objects
for select
to public
using (bucket_id = 'prompt-images');

-- Logged-in users may upload only into their own UUID folder.
drop policy if exists "Users can upload own IGTrendy prompt images" on storage.objects;
create policy "Users can upload own IGTrendy prompt images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'prompt-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Users can delete their own uploaded image if the database insert fails or they replace it later.
drop policy if exists "Users can delete own IGTrendy prompt images" on storage.objects;
create policy "Users can delete own IGTrendy prompt images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'prompt-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
