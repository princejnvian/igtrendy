import { NextResponse } from "next/server";
import { requireAdmin, serviceClient, slugify } from "@/lib/server";

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const title = String(body.title || "").trim();
    const content_html = String(body.content_html || "").trim();
    const category = String(body.category || "Trending").trim() || "Trending";
    const status = ["draft", "published", "archived"].includes(body.status) ? body.status : "draft";
    if (!title) return NextResponse.json({ error: "Please enter an article title." }, { status: 400 });
    if (!content_html) return NextResponse.json({ error: "Please write some article content before saving." }, { status: 400 });
    const db = serviceClient();
    const baseSlug = slugify(String(body.slug || title)) || `article-${Date.now()}`;
    let slug = baseSlug;
    for (let i = 2; i < 30; i++) {
      const { data: existing, error: lookupError } = await db.from("articles").select("id").eq("slug", slug).maybeSingle();
      if (lookupError) throw new Error(`Slug check failed: ${lookupError.message}`);
      if (!existing) break;
      slug = `${baseSlug}-${i}`;
    }
    const now = new Date().toISOString();
    const payload: any = {
      title, slug, excerpt: String(body.excerpt || "").trim(), content_html,
      cover_image_url: String(body.cover_image_url || "").trim() || null,
      category,
      tags: Array.isArray(body.tags) ? body.tags.map((x:any)=>String(x).trim()).filter(Boolean) : [],
      status,
      published_at: status === "published" ? (body.published_at || now) : null,
      updated_at: now,
    };
    const { data, error } = await db.from("articles").insert(payload).select("id,title,slug,status,category,created_at,updated_at,published_at,cover_image_url,views,excerpt,content_html,tags").single();
    if (error) throw new Error(`Article creation failed: ${error.message}`);
    return NextResponse.json({ ok: true, article: data, message: status === "published" ? "Article published." : "Draft saved." }, { status: 201 });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "Article creation failed." }, { status: e?.message?.includes("Admin") || e?.message?.includes("Authentication") ? 403 : 500 });
  }
}
