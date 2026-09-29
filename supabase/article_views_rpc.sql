-- Optional atomic helper for future view-tracking changes.
create or replace function public.increment_article_views(article_uuid uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare new_views bigint;
begin
  update public.articles
  set views = coalesce(views, 0) + 1
  where id = article_uuid and status = 'published'
  returning views into new_views;
  return new_views;
end;
$$;
revoke all on function public.increment_article_views(uuid) from public;
grant execute on function public.increment_article_views(uuid) to anon, authenticated;
