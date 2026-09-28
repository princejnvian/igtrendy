# IGTrendy — AI-powered global trending platform

This rebuild keeps the existing IGTrendy AI prompt/image community and adds a media platform for Gaming, Movies, Web Series, Events, Theories and Explained stories.

## Setup
1. Keep the existing Supabase project and existing `profiles`, `categories`, `prompts` and storage data.
2. Run `supabase/rebuild_media_platform.sql` in the Supabase SQL editor.
3. Add server-only variables from `.env.example`: `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `CRON_SECRET`.
4. Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` to the browser.
5. Make your account admin by setting `profiles.role = 'admin'` for your user once in Supabase SQL.
6. Deploy to Vercel. The included `vercel.json` schedules a trend scan every 6 hours; configure a matching `CRON_SECRET`.

## AI Command Center
Open `/admin`, sign in with an admin account, then issue commands such as:
- "Write an article about the latest GTA 6 update and publish it."
- "Find today's biggest gaming trend and save it as a draft."
- "Update my existing article about ..." (update workflow can be added next).

The AI research/publishing endpoint uses Gemini server-side. It can use fresh Google News RSS signals for current information and can generate a cover image when the configured image model is available.

## Important
AI output is not guaranteed to be factually perfect. Keep sensitive topics behind review and verify important claims before automatic publication. AdSense approval and earnings are not guaranteed.

### Automatic publishing
Set `AUTO_PUBLISH_TRENDS=true` only after you are comfortable with the editorial checks. When true, the Vercel cron scans trends every 6 hours, researches selected topics, creates articles, generates a cover image, creates web-story slides and publishes them. Keep it `false` to use the trend queue as a review workflow.

## AI trend scanner setup
The scanner intentionally requires `GEMINI_API_KEY` and does not generate articles or images during scanning. It only queues shortlisted trends. Article/image generation starts only after an admin chooses a trend.

Recommended server limits:
- `DAILY_TREND_SCAN_LIMIT=2`
- `DAILY_ARTICLE_LIMIT=5`
- `DAILY_IMAGE_LIMIT=5`
- `AUTO_PUBLISH_TRENDS=false`
