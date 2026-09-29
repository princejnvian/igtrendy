import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteHeader from "@/components/site-header";
import { getArticleCardImage } from "@/lib/article-media";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const name = slug.replaceAll("-", " ");
  const { data } = await supabase
    .from("articles")
    .select("id,title,slug,excerpt,cover_image_url,content_html,category,published_at")
    .eq("status", "published")
    .ilike("category", name)
    .order("published_at", { ascending: false })
    .limit(50);

  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="page-head">
        <div className="eyebrow">CATEGORY</div>
        <h1>{name.replace(/\b\w/g, c => c.toUpperCase())}</h1>
        <p>Latest stories and updates.</p>
      </section>
      <div className="article-list">
        {(data ?? []).map((a: any) => {
          const imageUrl = getArticleCardImage(a.cover_image_url, a.content_html);
          return (
            <Link className="article-row" href={`/article/${a.slug}`} key={a.id}>
              {imageUrl ? <img src={imageUrl} alt="" /> : <div className="row-placeholder">✦</div>}
              <div>
                <h2>{a.title}</h2>
                <p>{a.excerpt}</p>
                <small>{new Date(a.published_at).toLocaleDateString()}</small>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
