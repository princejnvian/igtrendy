import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/server";

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    if (!slug) return NextResponse.json({ error: "Missing slug." }, { status: 400 });
    const db = serviceClient();
    const { data: article, error: lookupError } = await db.from("articles").select("id,views").eq("slug", slug).eq("status", "published").maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (!article) return NextResponse.json({ ok: false }, { status: 404 });
    const { error } = await db.from("articles").update({ views: Number(article.views || 0) + 1 }).eq("id", article.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
