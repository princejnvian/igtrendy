import { NextResponse } from "next/server";
import { requireAdmin, serviceClient, slugify } from "@/lib/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const db = serviceClient();
    const { data, error } = await db.from("articles").select("*,article_sources(*)").eq("id", id).maybeSingle();
    if (error) throw new Error(`Article lookup failed: ${error.message}`);
    if (!data) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    return NextResponse.json({ ok: true, article: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Article lookup failed." }, { status: e?.message?.includes("Admin") ? 403 : 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const title = String(body.title || "").trim();
    const excerpt = String(body.excerpt || "").trim();
    const content_html = String(body.content_html || "").trim();
    const category = String(body.category || "Trending");
    const status = ["draft", "published", "archived"].includes(body.status) ? body.status : "draft";
    if (!title || !content_html) return NextResponse.json({ error: "Title and article content are required." }, { status: 400 });
    const db = serviceClient();
    const update: any = {
      title,
      slug: slugify(String(body.slug || title)),
      excerpt,
      content_html,
      cover_image_url: String(body.cover_image_url || "").trim() || null,
      category,
      tags: Array.isArray(body.tags) ? body.tags.map((x:any)=>String(x).trim()).filter(Boolean) : [],
      status,
      updated_at: new Date().toISOString(),
      published_at: status === "published" ? (body.published_at || new Date().toISOString()) : null
    };
    const { data, error } = await db.from("articles").update(update).eq("id", id).select("id,title,slug,status,cover_image_url,updated_at").single();
    if (error) throw new Error(`Article save failed: ${error.message}`);
    return NextResponse.json({ ok: true, article: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Article save failed." }, { status: e?.message?.includes("Admin") ? 403 : 500 });
  }
}
