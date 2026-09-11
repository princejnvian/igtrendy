IGTrendy Dynamic SEO Update

Copy/overwrite these files into your existing IGTrendy project, keeping your existing .env.local and .git folder:

app/layout.tsx
app/robots.ts
app/sitemap.ts
app/prompt/[id]/page.tsx
app/prompt/[id]/PromptActions.tsx

What this adds:
- Dynamic sitemap: includes every published prompt from Supabase automatically.
- Published prompt detail pages load the real Supabase prompt instead of falling back to a demo page.
- Per-prompt SEO title, description, canonical URL and Open Graph image.
- Existing demo prompt URLs remain in the sitemap.
- robots.txt continues to expose the sitemap.

After copying files:
1. npm run build
2. git add .
3. git commit -m "Make prompt SEO dynamic"
4. git push origin main

Vercel will deploy automatically.
