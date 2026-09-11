import type { MetadataRoute } from "next";

const promptPages = [
  "retro-80s",
  "cinematic-man",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: "https://igtrendy.in",
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    ...promptPages.map((id) => ({
      url: `https://igtrendy.in/prompt/${id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
