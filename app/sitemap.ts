import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://igtrendy.in";
  const categorySlugs = [
    "news", "trending", "sports", "cricket", "ipl", "football", "tennis",
    "stock-market", "crypto", "gaming", "bollywood", "hollywood", "movies",
    "web-series", "events", "theories", "explained",
  ];
  const staticPaths = [
    "/", "/trending", "/prompts", "/about", "/contact", "/privacy", "/terms",
    "/editorial-policy", "/corrections", "/disclaimer",
    ...categorySlugs.map((slug) => \`/category/\${slug}\`),
  ];

  const [{ data: articles }, { data: prompts }] = await Promise.all([
    supabase.from("articles").select("slug,updated_at,published_at").eq("status", "published").limit(5000),
    supabase.from("prompts").select("id,created_at").eq("status", "published").limit(5000),
  ]);

  return [
    ...staticPaths.map((path) => ({ url: base + path })),
    ...(articles ?? []).map((article) => ({
      url: \`\${base}/article/\${article.slug}\`,
      lastModified: new Date(article.updated_at || article.published_at || Date.now()),
    })),
    ...(prompts ?? []).map((prompt) => ({
      url: \`\${base}/prompt/\${prompt.id}\`,
      lastModified: new Date(prompt.created_at),
    })),
  ];
}
