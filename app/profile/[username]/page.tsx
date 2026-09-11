"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Profile({ params }: { params: Promise<{ username: string }> }) {
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    params.then(async ({ username: routeUsername }) => {
      if (!mounted) return;
      setUsername(routeUsername);
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user;
      if (currentUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", currentUser.id)
          .maybeSingle();
        const sameProfile = profile?.username === routeUsername;
        const admin = (currentUser.app_metadata?.role === "admin");
        if (mounted) setIsAdmin(Boolean(sameProfile && admin));
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
          <h1>{username}</h1>
          <p>AI image creator · Sharing cinematic, retro and viral visual ideas.</p>
          <div className="profile-stats"><b>124 <small>prompts</small></b><b>8.4K <small>followers</small></b><b>31K <small>copies</small></b></div>
        </div>
        <div className="profile-actions">
          {!loading && isAdmin && <Link href="/admin">⚙ Admin Panel</Link>}
          <button>Add Friend</button>
          <Link href="/messages">Message</Link>
        </div>
      </div>
      <div className="section-head"><div><h2>Creator's prompts</h2><p>Latest published work</p></div></div>
      <div className="profile-grid"><div/><div/><div/><div/></div>
    </main>
  );
}
