import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/messages", "/login"],
    },
    sitemap: "https://igtrendy.in/sitemap.xml",
    host: "https://igtrendy.in",
  };
}
