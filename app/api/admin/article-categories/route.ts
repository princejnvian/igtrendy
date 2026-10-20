import { NextResponse } from "next/server";
import { requireAdmin, serviceClient, slugify } from "@/lib/server";

const DEFAULTS = ["Trending","News","Gaming","Movies","Web Series","Events","Theories","Explained","Sports","Cricket","IPL","Football","Tennis","Esports","Bollywood","Hollywood","Stock Market","Indian Stocks","Global Markets","Crypto"];

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const db = serviceClient();
    const [{ data: saved, error: savedError }, { data: used, error: usedError }] = await Promise.all([
      db.from("article_categories").select("id,name,slug,created_at").order("name"),
      db.from("articles").select("category").limit(2000),
    ]);
    if (savedError && !/article_categories/i.test(savedError.message)) throw new Error(savedError.message);
    if (usedError) throw new Error(usedError.message);
    const names = new Map<string, any>();
    for (const name of DEFAULTS) names.set(name.toLowerCase(), { id: `default-${slugify(name)}`, name, slug: slugify(name), is_default: true });
    for (const row of used || []) { const name = String(row.category || "").trim(); if (name) names.set(name.toLowerCase(), { id: `used-${slugify(name)}`, name, slug: slugify(name), is_default: false }); }
    for (const row of saved || []) names.set(String(row.name).toLowerCase(), { ...row, is_default: false });
    return NextResponse.json({ ok: true, categories: [...names.values()].sort((a,b)=>a.name.localeCompare(b.name)), tableReady: !savedError });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "Category lookup failed." }, { status: e?.message?.includes("Admin") || e?.message?.includes("Authentication") ? 403 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const name = String(body.name || "").trim().replace(/\s+/g, " ");
    if (!name || name.length > 60) return NextResponse.json({ error: "Category name must be between 1 and 60 characters." }, { status: 400 });
    const db = serviceClient();
    const slug = slugify(name);
    const { data, error } = await db.from("article_categories").upsert({ name, slug }, { onConflict: "slug" }).select("id,name,slug,created_at").single();
    if (error) throw new Error(`Could not save category. Run supabase/manual_article_categories.sql in Supabase SQL Editor first. Details: ${error.message}`);
    return NextResponse.json({ ok: true, category: data }, { status: 201 });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "Category creation failed." }, { status: e?.message?.includes("Admin") || e?.message?.includes("Authentication") ? 403 : 500 });
  }
}
