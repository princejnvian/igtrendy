import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/server";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const db = serviceClient();
    const [{ data: articles, error: articleError }, { data: stories, error: storyError }] = await Promise.all([
      db.from("articles").select("id,title,slug,status,category,created_at,updated_at,cover_image_url").order("created_at", { ascending: false }).limit(30),
      db.from("web_stories").select("id,article_id,title,slides,status,created_at,published_at").order("created_at", { ascending: false }).limit(30)
    ]);
    if (articleError) throw new Error(`Articles lookup failed: ${articleError.message}`);
    if (storyError) throw new Error(`Stories lookup failed: ${storyError.message}`);
    return NextResponse.json({ ok: true, articles: articles || [], stories: stories || [] });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "Content lookup failed." }, { status: e?.message?.includes("Admin") ? 403 : 500 });
  }
}
