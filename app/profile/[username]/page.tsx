"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Profile({ params }: { params: Promise<{ username: string }> }) {
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [profilePrompts, setProfilePrompts] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    params.then(async ({ username: routeUsername }) => {
      if (!mounted) return;
      setUsername(routeUsername);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, full_name, bio, avatar_url")
        .eq("username", routeUsername)
        .maybeSingle();

      if (!mounted) return;
      setProfile(profileData ?? null);

      if (profileData?.id) {
        const { data: promptData } = await supabase
          .from("prompts")
          .select("id, title, image_url, views, likes, published_at")
          .eq("creator_id", profileData.id)
          .eq("status", "published")
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false });

        if (mounted) setProfilePrompts(promptData ?? []);
      } else if (mounted) {
        setProfilePrompts([]);
      }

      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user;
      if (currentUser && profileData) {
        const sameProfile = profileData.id === currentUser.id;
        const { data: adminCheck } = await supabase.rpc("is_igtrendy_admin");
        if (mounted) setIsAdmin(Boolean(sameProfile && adminCheck));
      }

      if (mounted) setLoading(false);
    });

    return () => { mounted = false; };
  }, [params]);


  return (
    <main className="simple-page profile-page">
      <header className="detail-nav">
        <Link href="/">← Explore</Link>
        <Link className="brand" href="/"><span className="brand-mark">✦</span> IG<span>TRENDY</span></Link>
        <Link href="/messages">Messages</Link>
      </header>
      <div className="profile-head">
        <div className="profile-avatar">{username[0]?.toUpperCase()}</div>
        <div>
          <div className="eyebrow"><span/> CREATOR</div>
          <h1>{profile?.full_name || username}</h1>
          <p>{profile?.bio || "AI image creator · Sharing cinematic, retro and viral visual ideas."}</p>
          <div className="profile-stats"><b>124 <small>prompts</small></b><b>8.4K <small>followers</small></b><b>31K <small>copies</small></b></div>
        </div>
        <div className="profile-actions">
          {!loading && isAdmin && <Link href="/admin" className="admin-profile-btn">⚙ Admin Panel</Link>}
          <button>Add Friend</button>
          <Link href="/messages">Message</Link>
        </div>
      </div>
      <div className="section-head"><div><h2>Creator's prompts</h2><p>Latest published work</p></div></div>
      <div className="profile-grid">
        {profilePrompts.map((prompt) => (
          <Link href={`/prompt/${prompt.id}`} className="profile-prompt-card" key={prompt.id}>
            <img src={prompt.image_url} alt={prompt.title} />
            <div className="profile-prompt-info">
              <strong>{prompt.title}</strong>
              <span>♡ {Number(prompt.likes ?? 0).toLocaleString()} · ◉ {Number(prompt.views ?? 0).toLocaleString()}</span>
            </div>
          </Link>
        ))}
        {!loading && !profilePrompts.length && (
          <div className="profile-empty">No published prompts yet.</div>
        )}
      </div>
    </main>
  );
}
