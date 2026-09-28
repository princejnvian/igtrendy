-- article-images is intended to be PUBLIC for reading generated cover images.
-- Server-side uploads use SUPABASE_SERVICE_ROLE_KEY, so no client upload policy is required.
-- Confirm the bucket exists:
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'article-images';
