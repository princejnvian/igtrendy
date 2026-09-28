-- IGTrendy AI publishing permissions fix
-- Run this once in Supabase SQL Editor.
-- The AI publishing API uses the server-side service_role client.
-- Explicit table grants are required when default Data API grants have been revoked.

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.articles,
  public.article_sources,
  public.web_stories,
  public.trend_queue,
  public.ai_usage_daily
TO service_role;

-- article_sources uses an identity sequence.
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Keep the server-side usage function callable.
GRANT EXECUTE ON FUNCTION public.record_ai_usage(text) TO service_role;

-- Verify the critical table grants after running this migration.
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
  AND table_schema = 'public'
  AND table_name IN ('articles','article_sources','web_stories','trend_queue','ai_usage_daily')
ORDER BY table_name, privilege_type;
