# IGTrendy Manual Article Studio

## What changed
- Added **Write article** in Admin → Articles.
- Manually set headline, URL slug, excerpt/SEO summary, category, tags, cover image, article HTML and publishing status.
- Upload cover and inline images to the existing `article-images` Supabase Storage bucket.
- Added formatting toolbar buttons for H2/H3, bold, italic, paragraph, bullet list and links.
- Added custom article categories saved to Supabase.
- Article creation does not call Gemini, OpenRouter or Grok.

## One-time Supabase setup
1. Open Supabase Dashboard → SQL Editor.
2. Paste and run `supabase/manual_article_categories.sql`.
3. Ensure Storage bucket `article-images` exists and is public, with JPG/PNG/WebP allowed (8 MB or higher max).

## Deploy
Replace the project files with the contents of this ZIP, keeping your existing `.env.local` on your own computer. Do not commit `.env.local`.

```bash
npm install
npm run build
```

If build passes:

```bash
git status
git add .
git commit -m "Add manual article composer and custom categories"
git push origin main
```

Vercel will deploy from `main`.

## How to publish manually
Admin → Articles → **Write article**. Fill title, slug, excerpt, category, tags, upload a cover image, write the body, then choose **Publish now** and click **Save article**. Drafts can be edited later from the Articles/Drafts lists.

The article body is semantic HTML. The toolbar inserts common HTML tags at the cursor/selection; inline images are inserted where the cursor was. This is a simple, reliable manual editor, not a WYSIWYG visual editor.
