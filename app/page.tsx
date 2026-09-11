"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const categories = [
  ["🔥", "Viral / Trending"], ["👤", "AI Portraits"], ["📸", "Instagram Photos"],
  ["🎬", "Cinematic"], ["🕰️", "Retro / Vintage"], ["💍", "Wedding"], ["👔", "Fashion"],
  ["🧑‍💼", "Professional"], ["🎨", "Anime / Artistic"], ["🏞️", "Travel"], ["🏆", "Before / After"], ["🎭", "Character Creation"],
];

type HomePrompt = {
  id: string;
  title: string;
  creator: string;
  username: string;
  cat: string;
  views: number;
  likes: number;
  image: string;
};

function Icon({ children }: { children: React.ReactNode }) { return <span className="icon">{children}</span>; }

export default function Home() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("Viral / Trending");
  const [drawer, setDrawer] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [prompts, setPrompts] = useState<HomePrompt[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      const currentUser = data.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, full_name")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (mounted) {
          setUsername(
            profile?.username ||
              currentUser.user_metadata?.username ||
              currentUser.email?.split("@")[0] ||
              "Creator"
          );
        }
      } else {
        setUsername("");
      }

      if (mounted) setAuthLoading(false);
    }

    async function loadPrompts() {
      setLoadingPrompts(true);
      const { data, error } = await supabase
        .from("prompts")
        .select(`
          id, title, image_url, views, likes, created_at, published_at,
          profiles:creator_id (username, full_name),
          categories:category_id (name)
        `)
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error("Failed to load published prompts:", error);
        setPrompts([]);
      } else {
        setPrompts((data ?? []).map((row: any) => {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
          const creatorUsername = profile?.username || "creator";
          return {
            id: String(row.id),
            title: row.title,
            creator: profile?.full_name || creatorUsername,
            username: creatorUsername,
            cat: category?.name || "AI Prompts",
            views: Number(row.views ?? 0),
            likes: Number(row.likes ?? 0),
            image: row.image_url,
          };
        }));
      }
      setLoadingPrompts(false);
    }

    loadUser();
    loadPrompts();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setUsername("");
        setAuthLoading(false);
        return;
      }

      setTimeout(async () => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, full_name")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (mounted) {
          setUsername(
            profile?.username ||
              currentUser.user_metadata?.username ||
              currentUser.email?.split("@")[0] ||
              "Creator"
          );
          setAuthLoading(false);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setUsername("");
  }

  const filtered = useMemo(() => prompts.filter((p) => {
    const q = query.toLowerCase().trim();
    const matchesQuery = !q || `${p.title} ${p.creator} ${p.username} ${p.cat}`.toLowerCase().includes(q);
    const matchesCat = active === "Viral / Trending" || p.cat === active;
    return matchesQuery && matchesCat;
  }), [query, active, prompts]);

  const publishedCount = prompts.length;

  return (
    <main className="app-shell">
      <div className="ambient ambient-a"/><div className="ambient ambient-b"/>
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setDrawer(true)} aria-label="Open menu">☰</button>
        <Link href="/" className="brand"><span className="brand-mark">✦</span> IG<span>TRENDY</span></Link>
        <div className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search prompts, styles, creators..."/><kbd>⌘ K</kbd></div>
        <div className="top-actions">
          <Link className="upload-btn" href="/upload">＋ Upload Your Prompt</Link>
          {authLoading ? (
            <span className="signin">...</span>
          ) : user ? (
            <>
              <Link className="signin" href={`/profile/${encodeURIComponent(username || "creator")}`}>@{username || "creator"}</Link>
              <button type="button" className="signin mobile-signout" onClick={handleSignOut} style={{ background: "none", border: "none", cursor: "pointer" }}>Sign out</button>
              <Link href={`/profile/${encodeURIComponent(username || "creator")}`} className="avatar" aria-label="Open profile">{(username || "C")[0].toUpperCase()}</Link>
            </>
          ) : (
            <>
              <Link className="signin" href="/login">Sign in</Link>
              <Link href="/login" className="avatar" aria-label="Sign in">P</Link>
            </>
          )}
        </div>
      </header>

      <div className="layout">
        <aside className={`sidebar ${drawer ? "open" : ""}`}>
          <div className="side-head"><span>EXPLORE</span><button onClick={() => setDrawer(false)}>×</button></div>
          <nav>
            {categories.map(([emoji, name]) => <button key={name} className={active === name ? "active" : ""} onClick={() => { setActive(name); setDrawer(false); }}><Icon>{emoji}</Icon>{name}{name === "Viral / Trending" && <b>HOT</b>}</button>)}
          </nav>
          <div className="side-card"><div className="mini-orb">✦</div><strong>Share your style</strong><p>Upload a prompt and let the community discover it.</p><Link href="/upload">Create prompt →</Link></div>
          <div className="side-footer">© 2026 IGTrendy · <Link href="/admin">Studio</Link></div>
        </aside>
        {drawer && <button className="backdrop" onClick={() => setDrawer(false)} aria-label="Close menu"/>}

        <section className="content">
          <div className="hero-row"><div><div className="eyebrow"><span/> LIVE TRENDS <span className="pulse"/></div><h1>Discover the <em>prompt</em><br/>behind the picture.</h1><p>Find viral AI image ideas, copy the exact prompt, and create your own.</p></div><div className="hero-stats"><strong>{publishedCount.toLocaleString()}</strong><span>published prompts</span></div></div>
          <div className="section-head"><div><h2>{active}</h2><p>{active === "Viral / Trending" ? "Latest prompts published by the IGTrendy community." : `Popular prompts in ${active}.`}</p></div><div className="sort">Newest <span>⌄</span></div></div>

          {loadingPrompts ? (
            <div className="empty"><div>◌</div><h3>Loading prompts...</h3><p>Fetching the latest published creations.</p></div>
          ) : (
            <>
              <div className="masonry">
                {filtered.map(p => <Link href={`/prompt/${p.id}`} className="prompt-card" key={p.id}>
                  <div className="image-wrap"><img src={p.image} alt={p.title}/><div className="image-shade"/><div className="card-top"><span className="cat-pill">{p.cat}</span><span className="heart">♡</span></div><div className="get-prompt">Get Prompt <span>↗</span></div></div>
                  <div className="card-info"><h3>{p.title}</h3><div className="creator"><span className="small-avatar">{p.creator[0]?.toUpperCase() || "C"}</span><span>{p.creator}</span><span className="dot"/> <span>♥ {p.likes.toLocaleString()}</span><span className="views">◉ {p.views.toLocaleString()}</span></div></div>
                </Link>)}
              </div>
              {!filtered.length && <div className="empty"><div>✦</div><h3>{prompts.length ? "No prompts found" : "No prompts published yet"}</h3><p>{prompts.length ? "Try another keyword or category." : "Be the first creator to share a prompt with the community."}</p>{!prompts.length && <Link href="/upload">Upload your first prompt →</Link>}</div>}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
