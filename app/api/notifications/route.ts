import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") || 20);
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 20, 1), 50);

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, link, created_at, read_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json({ error: "Unable to load notifications." }, { status: 500 });
  }

  return NextResponse.json({ notifications: data || [] });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const now = new Date().toISOString();

  if (body?.all === true || typeof body?.type === "string") {
    let query = supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (typeof body?.type === "string") {
      if (body.type === "request") {
        query = query.in("type", ["project_request", "request_status"]);
      } else {
        query = query.eq("type", body.type);
      }
    }

    const { error } = await query;
    if (error) return NextResponse.json({ error: "Unable to mark notifications as read." }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const id = String(body?.id || "");
  if (!id) return NextResponse.json({ error: "Notification ID is required." }, { status: 400 });

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "Unable to mark notification as read." }, { status: 500 });
  return NextResponse.json({ success: true });
}
