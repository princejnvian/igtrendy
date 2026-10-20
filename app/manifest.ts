import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YOUTENT — Where Talent Meets Opportunity",
    short_name: "YOUTENT",
    description: "YOUTENT creator and freelancer marketplace.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8fb",
    theme_color: "#0f172a",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png", purpose: "any" },
    ],
  };
}