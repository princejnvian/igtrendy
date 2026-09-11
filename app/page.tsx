"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const categories = [
  ["🔥", "Viral / Trending"], ["👤", "AI Portraits"], ["📸", "Instagram Photos"],
  ["🎬", "Cinematic"], ["🕰️", "Retro / Vintage"], ["💍", "Wedding"], ["👔", "Fashion"],
  ["🧑‍💼", "Professional"], ["🎨", "Anime / Artistic"], ["🏞️", "Travel"], ["🏆", "Before / After"], ["🎭", "Character Creation"],
];

const prompts = [
  { id: "retro-80s", title: "80s Indian Retro Portrait", creator: "Prince", cat: "Retro / Vintage", views: 18420, likes: 1240, image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85", prompt: "Create a highly realistic 1980s Indian portrait with authentic film grain, warm analog colors, period-correct hairstyle and clothing, soft studio lighting, natural skin texture, vintage camera look, subtle imperfections, cinematic composition, and an unmistakable early-80s atmosphere. Preserve the person's facial identity." },
  { id: "cinematic-man", title: "Cinematic Street Portrait", creator: "Aarav", cat: "Cinematic", views: 12110, likes: 932, image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85", prompt: "Create a cinematic editorial portrait on a rain-soaked city street at night, realistic skin, dramatic practical lights, shallow depth of field, subtle film grain, rich shadows, premium photography, 85mm lens." },
  { id: "wedding-editorial", title: "Luxury Wedding Editorial", creator: "Maya", cat: "Wedding", views: 9870, likes: 811, image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85", prompt: "Create a luxury Indian wedding editorial photograph with elegant traditional styling, realistic fabric detail, soft golden light, premium magazine composition, natural expressions and cinematic depth." },
  { id: "retro-couple", title: "Vintage Couple — 1987", creator: "Neha AI", cat: "Retro / Vintage", views: 9340, likes: 790, image: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=900&q=85", prompt: "Transform the scene into a believable 1987 Indian couple photograph, authentic period fashion, analog colors, slightly faded print, realistic skin and hair, 35mm film texture and candid composition." },
  { id: "fashion-clean", title: "Clean Fashion Campaign", creator: "Karan", cat: "Fashion", views: 7920, likes: 640, image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=85", prompt: "Premium fashion campaign portrait, clean studio backdrop, sophisticated wardrobe, soft directional lighting, realistic skin texture, luxury editorial photography, crisp details and restrained color grading." },
  { id: "anime-self", title: "Anime Character Portrait", creator: "Riya", cat: "Anime / Artistic", views: 7440, likes: 610, image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=900&q=85", prompt: "Create a polished anime-inspired character portrait with expressive eyes, detailed hair, cinematic rim lighting, painterly textures and a premium animated-film aesthetic." },
  { id: "travel-film", title: "Travel Film Still", creator: "Kabir", cat: "Travel", views: 6910, likes: 521, image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=85", prompt: "Create a cinematic travel photograph that feels like a frame from an award-winning film, natural light, atmospheric depth, realistic details, subtle grain and authentic human emotion." },
  { id: "professional", title: "Modern Professional Headshot", creator: "Dev", cat: "Professional", views: 6240, likes: 488, image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=900&q=85", prompt: "Create a premium professional headshot with natural skin, clean wardrobe, soft studio lighting, subtle background blur, confident expression and realistic corporate photography." },
];

function Icon({ children }: { children: React.ReactNode }) { return <span className="icon">{children}</span>; }

export default function Home() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("Viral / Trending");
  const [drawer, setDrawer] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

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

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setUsername("");
        setAuthLoading(false);
        return;
      }

      // Fetch profile outside the auth callback's synchronous flow.
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

  const filtered = useMemo(() => prompts.filter(p => {
    const q = query.toLowerCase();
    const matchesQuery = !q || `${p.title} ${p.creator} ${p.cat}`.toLowerCase().includes(q);
    const matchesCat = active === "Viral / Trending" || p.cat === active;
    return matchesQuery && matchesCat;
  }), [query, active]);

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
              <Link className="signin" href={`/profile/${encodeURIComponent(username || "creator")}`}>
                @{username || "creator"}
              </Link>
              <button
                type="button"
                className="signin"
                onClick={handleSignOut}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                Sign out
              </button>
              <Link
                href={`/profile/${encodeURIComponent(username || "creator")}`}
                className="avatar"
                aria-label="Open profile"
              >
                {(username || "C")[0].toUpperCase()}
              </Link>
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
          <div className="hero-row"><div><div className="eyebrow"><span/> LIVE TRENDS <span className="pulse"/></div><h1>Discover the <em>prompt</em><br/>behind the picture.</h1><p>Find viral AI image ideas, copy the exact prompt, and create your own.</p></div><div className="hero-stats"><strong>12.8K+</strong><span>prompts shared</span></div></div>
          <div className="section-head"><div><h2>{active}</h2><p>{active === "Viral / Trending" ? "What creators are searching and copying right now." : `Popular prompts in ${active}.`}</p></div><div className="sort">Trending <span>⌄</span></div></div>
          <div className="masonry">
            {filtered.map(p => <Link href={`/prompt/${p.id}`} className="prompt-card" key={p.id}>
              <div className="image-wrap"><img src={p.image} alt={p.title}/><div className="image-shade"/><div className="card-top"><span className="cat-pill">{p.cat}</span><span className="heart">♡</span></div><div className="get-prompt">Get Prompt <span>↗</span></div></div>
              <div className="card-info"><h3>{p.title}</h3><div className="creator"><span className="small-avatar">{p.creator[0]}</span><span>{p.creator}</span><span className="dot"/> <span>♥ {p.likes.toLocaleString()}</span><span className="views">◉ {p.views.toLocaleString()}</span></div></div>
            </Link>)}
          </div>
          {!filtered.length && <div className="empty"><div>⌕</div><h3>No prompts found</h3><p>Try another keyword or category.</p></div>}
        </section>
      </div>
    </main>
  );
}
