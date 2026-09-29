import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/server";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() || "";
    const db = serviceClient();

    let articleQuery = db
      .from("articles")
      .select("id,title,slug,status,category,created_at,updated_at,published_at,cover_image_url,views")
      .order("created_at", { ascending: false })
      .limit(200);

    if (q) {
      const escaped = q.replace(/,/g, " ");
      articleQuery = articleQuery.or(`title.ilike.%${escaped}%,slug.ilike.%${escaped}%,category.ilike.%${escaped}%`);
    }

    const [{ data: articles, error: articleError }, { data: stories, error: storyError }, { count: totalArticles, error: totalError }, { count: publishedArticles, error: publishedError }, { count: draftArticles, error: draftError }, { data: viewRows, error: viewsError }] = await Promise.all([
      articleQuery,
      db.from("web_stories").select("id,article_id,title,slides,status,created_at,published_at").order("created_at", { ascending: false }).limit(100),
      db.from("articles").select("id", { count: "exact", head: true }),
      db.from("articles").select("id", { count: "exact", head: true }).eq("status", "published"),
      db.from("articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
      db.from("articles").select("views")
    ]);

    if (articleError) throw new Error(`Articles lookup failed: ${articleError.message}`);
    if (storyError) throw new Error(`Stories lookup failed: ${storyError.message}`);
    if (totalError || publishedError || draftError || viewsError) throw new Error("Article statistics lookup failed.");

    const totalViews = (viewRows || []).reduce((sum: number, a: any) => sum + Number(a.views || 0), 0);

    return NextResponse.json({
      ok: true,
      articles: articles || [],
      stories: stories || [],
      stats: {
        totalArticles: totalArticles || 0,
        publishedArticles: publishedArticles || 0,
        draftArticles: draftArticles || 0,
        totalViews
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Content lookup failed." }, { status: e?.message?.includes("Admin") ? 403 : 500 });
  }
}
