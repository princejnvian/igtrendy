import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const db = serviceClient();
    const { data, error } = await db.from("web_stories").select("*,articles:article_id(slug,title)").eq("id", id).maybeSingle();
    if (error) throw new Error(`Story lookup failed: ${error.message}`);
    if (!data) return NextResponse.json({ error: "Web story not found." }, { status: 404 });
    return NextResponse.json({ ok: true, story: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Story lookup failed." }, { status: e?.message?.includes("Admin") ? 403 : 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const title = String(body.title || "").trim();
    const slides = Array.isArray(body.slides) ? body.slides.map((s:any, i:number) => ({
      headline: String(s?.headline || `Slide ${i+1}`).trim(),
      body: String(s?.body || "").trim(),
      image_url: String(s?.image_url || "").trim()
    })) : [];
    const status = ["draft", "published", "archived"].includes(body.status) ? body.status : "draft";
    if (!title || !slides.length) return NextResponse.json({ error: "Story title and at least one slide are required." }, { status: 400 });
    const db = serviceClient();
    const { data, error } = await db.from("web_stories").update({ title, slides, status, published_at: status === "published" ? new Date().toISOString() : null }).eq("id", id).select("id,title,slides,status,published_at").single();
    if (error) throw new Error(`Story save failed: ${error.message}`);
    return NextResponse.json({ ok: true, story: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Story save failed." }, { status: e?.message?.includes("Admin") ? 403 : 500 });
  }
}
