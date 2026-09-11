import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";


export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const { data: publishedPrompts } = await supabase
    .from("prompts")
    .select("id, published_at, created_at")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false });

  const databasePromptPages = (publishedPrompts ?? []).map((prompt) => ({
    url: `https://igtrendy.in/prompt/${prompt.id}`,
    lastModified: new Date(prompt.published_at ?? prompt.created_at ?? now),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: "https://igtrendy.in",
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    ...databasePromptPages,
  ];
}
