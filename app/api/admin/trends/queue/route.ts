import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server";

export async function GET(request: Request) {
  try {
    const { client: db } = await requireAdmin(request);
    const { data, error } = await db
      .from("trend_queue")
      .select("id,topic,slug,category,why_now,trend_score,source_urls,status,created_at,scanned_at")
      .in("status", ["queued", "drafted"])
      .order("trend_score", { ascending: false })
      .order("scanned_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return NextResponse.json({ trends: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Could not load trends." }, { status: e.message?.includes("Admin") || e.message?.includes("Authentication") ? 403 : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { client: db } = await requireAdmin(request);
    const body = await request.json();
    const id = String(body.id || "");
    const status = String(body.status || "");
    if (!id || !["ignored", "queued", "drafted", "published"].includes(status)) return NextResponse.json({ error: "Invalid trend action." }, { status: 400 });
    const { error } = await db.from("trend_queue").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Could not update trend." }, { status: e.message?.includes("Admin") || e.message?.includes("Authentication") ? 403 : 500 });
  }
}
