import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ last_seen_at: now, updated_at: now })
    .eq("id", user.id);

  if (error) {
    console.error("Presence update error:", error);
    return NextResponse.json({ error: "Unable to update presence." }, { status: 500 });
  }

  return NextResponse.json({ online: true, lastSeenAt: now });
}