import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import SiteHeader from "@/components/site-header";
import ArticleViewTracker from "./ArticleViewTracker";

function categoryHref(value: string | null | undefined) {
  const category = String(value || "News").toLowerCase();
  if (category === "ipl") return "/category/ipl";
  if (["cricket"].includes(category)) return "/category/cricket";
  if (["football"].includes(category)) return "/category/football";
  if (["tennis"].includes(category)) return "/category/tennis";
  if (["sports"].includes(category)) return "/category/sports";
  if (["stock market", "indian stocks", "global markets"].includes(category)) return "/category/stock-market";
  if (category === "crypto") return "/category/crypto";
  if (category === "bollywood") return "/category/bollywood";
  if (category === "hollywood") return "/category/hollywood";
  if (["gaming", "esports"].includes(category)) return "/category/gaming";
  if (category === "web series") return "/category/web-series";
  if (category === "movies") return "/category/movies";
  if (category === "events") return "/category/events";
  if (category === "explained") return "/category/explained";
  if (category === "theories") return "/category/theories";
  if (category === "trending") return "/category/trending";
  return "/category/news";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase
    .from("articles")
    .select("title,excerpt,cover_image_url,slug,published_at,updated_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!data) return { title: "Story not found", robots: { index: false, follow: false } };

  return {
    title: data.title,
    description: String(data.excerpt || data.title).slice(0, 160),
    alternates: { canonical: `/article/${data.slug}` },
    openGraph: {
      type: "article",
      siteName: "IGTrendy",
      title: data.title,
      description: String(data.excerpt || data.title).slice(0, 200),
      url: `https://igtrendy.in/article/${data.slug}`,
      publishedTime: data.published_at || undefined,
      modifiedTime: data.updated_at || undefined,
      images: data.cover_image_url ? [{ url: data.cover_image_url, alt: data.title }] : [],
    },
    twitter: {
      card: data.cover_image_url ? "summary_large_image" : "summary",
      title: data.title,
      description: String(data.excerpt || data.title).slice(0, 200),
      images: data.cover_image_url ? [data.cover_image_url] : [],
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await supabase
    .from("articles")
    .select("*,article_sources(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!data) notFound();

  const publishedAt = data.published_at || data.created_at;
  const modifiedAt = data.updated_at || publishedAt;
  const canonicalUrl = `https://igtrendy.in/article/${data.slug}`;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.title,
    description: data.excerpt || data.title,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    datePublished: publishedAt,
    dateModified: modifiedAt,
    image: data.cover_image_url ? [data.cover_image_url] : undefined,
    publisher: { "@type": "Organization", name: "IGTrendy", url: "https://igtrendy.in" },
    articleSection: data.category || "News",
    inLanguage: "en",
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://igtrendy.in" },
      { "@type": "ListItem", position: 2, name: data.category || "Stories", item: `https://igtrendy.in${categoryHref(data.category)}` },
      { "@type": "ListItem", position: 3, name: data.title, item: canonicalUrl },
    ],
  };

  return (
    <main className="site-shell">
      <SiteHeader />
      <ArticleViewTracker slug={slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c") }} />
      <article className="article-page">
        <span className="article-category"><Link href={categoryHref(data.category)}>{data.category || "News"}</Link></span>
        <h1>{data.title}</h1>
        <p className="article-excerpt">{data.excerpt}</p>
        <div className="article-meta">Published {new Date(publishedAt).toLocaleDateString("en-US")} · Updated {new Date(modifiedAt).toLocaleDateString("en-US")} · {data.views || 0} views</div>
        {data.cover_image_url && <img className="article-cover" src={data.cover_image_url} alt={data.title} />}
        <div className="article-content" dangerouslySetInnerHTML={{ __html: data.content_html }} />
        {data.article_sources?.length ? <section className="sources"><h3>Sources</h3><ul>{data.article_sources.map((source: any) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer noopener nofollow">{source.title || source.url}</a></li>)}</ul></section> : null}
        <nav aria-label="Related topics" className="article-related"><h2>Explore more on IGTrendy</h2><p><Link href="/category/trending">Trending</Link> · <Link href="/category/news">News</Link> · <Link href="/category/sports">Sports</Link> · <Link href="/category/stock-market">Stock Market</Link> · <Link href="/category/crypto">Crypto</Link> · <Link href="/category/bollywood">Bollywood</Link> · <Link href="/category/hollywood">Hollywood</Link></p></nav>
      </article>
    </main>
  );
}
