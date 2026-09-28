export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteHeader from "@/components/site-header";

const sections = [
  ["🔥", "Trending", "/trending"], ["🎮", "Gaming", "/category/gaming"], ["🎬", "Movies", "/category/movies"],
  ["📺", "Web Series", "/category/web-series"], ["🏆", "Events", "/category/events"], ["🧠", "Theories", "/category/theories"],
  ["🔍", "Explained", "/category/explained"], ["🎨", "AI Prompts", "/prompts"],
];

export default async function Home() {
  const { data: articles } = await supabase.from("articles").select("id,title,slug,excerpt,cover_image_url,category,views,published_at").eq("status", "published").order("published_at", { ascending: false }).limit(12);
  const { data: prompts } = await supabase.from("prompts").select("id,title,image_url,views,likes,categories:category_id(name)").eq("status", "published").order("created_at", { ascending: false }).limit(6);

  return <main className="site-shell">
    <SiteHeader />
    <section className="hero"><div><div className="eyebrow">● LIVE INTERNET TRENDS</div><h1>Everything the internet is <em>talking about.</em></h1><p>Games, movies, shows, events, theories and the stories behind what is trending worldwide.</p><div className="hero-actions"><Link className="primary-btn" href="/trending">Explore trending →</Link><Link className="secondary-btn" href="/prompts">Explore AI prompts</Link></div></div><div className="hero-card"><span>WHAT'S HOT</span><strong>Fresh stories.<br/>Updated continuously.</strong><small>AI-assisted research · Human-controlled publishing</small></div></section>
    <section className="category-strip">{sections.map(([icon,name,url]) => <Link href={url} key={url}><b>{icon}</b><span>{name}</span></Link>)}</section>
    <section className="content-section"><div className="section-title"><div><div className="eyebrow">LATEST</div><h2>Trending stories</h2></div><Link href="/trending">View all →</Link></div><div className="article-grid">{(articles ?? []).map((a:any) => <Link className="article-card" href={`/article/${a.slug}`} key={a.id}>{a.cover_image_url ? <img src={a.cover_image_url} alt=""/> : <div className="article-placeholder">{a.category?.slice(0,1) || "✦"}</div>}<div className="article-card-body"><span>{a.category}</span><h3>{a.title}</h3><p>{a.excerpt || "Read the latest update and what it means."}</p><small>{a.views || 0} views</small></div></Link>)}</div>{!(articles?.length) && <div className="empty-state"><h3>Your first stories will appear here.</h3><p>Use Studio → AI Command Center to create and publish the first article.</p></div>}</section>
    <section className="content-section prompt-section"><div className="section-title"><div><div className="eyebrow">FROM THE ORIGINAL IGTrendy</div><h2>AI Prompts</h2></div><Link href="/prompts">View all →</Link></div><div className="prompt-grid">{(prompts ?? []).map((p:any) => <Link className="prompt-mini" href={`/prompt/${p.id}`} key={p.id}><img src={p.image_url} alt={p.title}/><div><b>{p.title}</b><span>Copy prompt · {p.likes || 0} likes</span></div></Link>)}</div></section>
    <footer className="footer"><span>© 2026 IGTrendy</span><div><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer>
  </main>;
}
