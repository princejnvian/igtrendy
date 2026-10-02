"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const sections = [
  ["🔥", "Trending", "/trending"],
  ["🎮", "Gaming", "/category/gaming"],
  ["🎬", "Movies", "/category/movies"],
  ["📺", "Web Series", "/category/web-series"],
  ["🏆", "Events", "/category/events"],
  ["🧠", "Theories", "/category/theories"],
];

export default function SiteHeader() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    const currentUser = data.user ?? null;
    setUser(currentUser);

    if (currentUser) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username,full_name,avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle();
      setProfile(profileData ?? null);
    } else {
      setProfile(null);
    }
    setReady(true);
  }

  useEffect(() => {
    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      // Give Supabase a moment to finish updating the session before reading it.
      window.setTimeout(loadUser, 0);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const displayName = profile?.full_name || profile?.username || user?.email?.split("@")[0] || "Account";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="site-header">
      <Link href="/" className="logo logo-image-link" aria-label="IGTrendy home">
        <img src="/igtrendy-logo.svg" alt="IGTrendy" className="site-logo-image" />
      </Link>

      <nav>
        {sections.map(([icon, name, url]) => (
          <Link key={url} href={url}>{icon} {name}</Link>
        ))}
      </nav>

      <div className="header-actions">
        {!ready ? (
          <span className="header-account-loading" aria-hidden="true" />
        ) : user ? (
          <div className="account-menu-wrap">
            <button
              type="button"
              className="account-button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="account-avatar" />
              ) : (
                <span className="account-avatar account-initial">{initial}</span>
              )}
              <span className="account-name">{displayName}</span>
              <span className="account-chevron">⌄</span>
            </button>

            {menuOpen && (
              <div className="account-dropdown">
                <div className="account-dropdown-head">
                  <strong>{displayName}</strong>
                  <small>{user.email}</small>
                </div>
                {profile?.username && (
                  <Link href={`/profile/${profile.username}`} onClick={() => setMenuOpen(false)}>
                    👤 My profile
                  </Link>
                )}
                <Link href="/prompts" onClick={() => setMenuOpen(false)}>🎨 AI Prompts</Link>
                <Link href="/admin" onClick={() => setMenuOpen(false)}>⚙ Studio</Link>
                <button type="button" onClick={signOut}>↪ Sign out</button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link href="/login">Sign in</Link>
            <Link className="signup-header-btn" href="/login?mode=signup">Sign up</Link>
          </>
        )}
      </div>
    </header>
  );
}
