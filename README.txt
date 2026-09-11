IGTrendy Production Upload Flow Patch

Files:
- app/upload-page.tsx -> rename/copy to app/upload/page.tsx
- globals.css -> append the contents to app/globals.css (or use the provided file as reference; do not replace unrelated styles)
- app/profile/[username]/page.tsx -> use this only if your current profile page does not already contain the Admin Panel button
- supabase/storage_setup.sql -> RUN ONCE in the current IGTrendy Supabase SQL Editor

After copying the code files:
  npm run build
  git add .
  git commit -m "Connect production prompt uploads"
  git push origin main

The upload flow writes images to the public Supabase Storage bucket prompt-images and creates a pending row in public.prompts. Admin Publish changes status to published. The dynamic sitemap already reads published prompts automatically.

Do not commit .env.local.
