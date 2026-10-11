import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const categoryGroups: Record<string, string[]> = {
  news: ["News"],
  trending: ["Trending","News","Sports","Cricket","IPL","Football","Tennis","Esports","Stock Market","Indian Stocks","Global Markets","Crypto","Bollywood","Hollywood","Gaming","Movies","Web Series","Events","Theories","Explained"],
  sports: ["Sports","Cricket","IPL","Football","Tennis","Esports"],
  cricket: ["Cricket","IPL"],
  ipl: ["IPL"],
  football: ["Football"],
  tennis: ["Tennis"],
  "stock-market": ["Stock Market","Indian Stocks","Global Markets"],
  crypto: ["Crypto"],
  gaming: ["Gaming","Esports"],
  bollywood: ["Bollywood"],
  hollywood: ["Hollywood"],
  movies: ["Movies","Bollywood","Hollywood"],
  "web-series": ["Web Series"],
  events: ["Events"],
  theories: ["Theories","Explained"],
  explained: ["Explained","Theories"],
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://igtrendy.in";
  const staticPaths = [
    "/", "/trending", "/prompts", "/about", "/contact", "/privacy", "/terms",
    "/editorial-policy", "/corrections", "/disclaimer",
  ];

  const [{ data: articles }, { data: prompts }, { data: categories }] = await Promise.all([
    supabase.from("articles").select("slug,updated_at,published_at,category").eq("status", "published").limit(5000),
    supabase.from("prompts").select("id,created_at").eq("status", "published").limit(5000),
    supabase.from("articles").select("category").eq("status", "published").limit(5000),
  ]);

  const liveCategories = new Set((categories ?? []).map((row: any) => String(row.category || "").toLowerCase()));
  const activeCategoryPaths = Object.entries(categoryGroups)
    .filter(([, group]) => group.some((category) => liveCategories.has(category.toLowerCase())))
    .map(([slug]) => \`/category/\${slug}\`);

  return [
    ...[...staticPaths, ...activeCategoryPaths].map((path) => ({ url: base + path })),
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
