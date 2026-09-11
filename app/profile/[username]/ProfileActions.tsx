"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ProfileActions({ profileUsername }: { profileUsername: string }) {
  const [isOwnAdminProfile, setIsOwnAdminProfile] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAdminProfile() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user || user.app_metadata?.role !== "admin") {
        if (mounted) setIsOwnAdminProfile(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (mounted) {
        setIsOwnAdminProfile(
          Boolean(profile?.username && profile.username.toLowerCase() === profileUsername.toLowerCase())
        );
      }
    }

    checkAdminProfile();
    return () => {
      mounted = false;
    };
  }, [profileUsername]);

  return (
    <div className="profile-actions">
      {isOwnAdminProfile && (
        <Link href="/admin" className="admin-profile-btn">
          ⚙ Admin Panel
        </Link>
      )}
      <button type="button">Add Friend</button>
      <Link href="/messages">Message</Link>
    </div>
  );
}
