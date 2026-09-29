"use client";
import { useEffect } from "react";

export default function ArticleViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `igtrendy:viewed:${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch(`/api/articles/${encodeURIComponent(slug)}/view`, { method: "POST", keepalive: true }).catch(() => {});
  }, [slug]);
  return null;
}
