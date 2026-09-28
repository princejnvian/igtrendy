import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/server";

async function generateImage(key:string, title:string, category:string, excerpt:string) {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      model: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
      input: `Create a polished editorial cover image for an English entertainment news website. Topic: ${title}. Category: ${category}. Context: ${excerpt}. Create a cinematic, realistic, professional 16:9 hero image. Do not add logos, watermarks, captions, headlines, or readable text.`,
      response_format: { type: "image", mime_type: "image/png", aspect_ratio: "16:9", image_size: "1K" }
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Gemini image generation failed (${response.status})${detail ? `: ${detail.slice(0,240)}` : "."}`);
  }

  const data = await response.json();
  const b64 = data.output_image?.data
    || data.steps?.flatMap((step:any) => Array.isArray(step?.content) ? step.content : [])?.find((x:any) => x?.type === "image")?.data
    || data.output?.find((x:any) => x?.type === "image")?.data;

  if (!b64) throw new Error("Gemini returned no image data.");
  return Buffer.from(b64, "base64");
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const key = process.env.GEMINI_API_KEY;
    if (!key) return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 503 });

    const db = serviceClient();
    const today = new Date().toISOString().slice(0,10);
    const imageLimit = Number(process.env.DAILY_IMAGE_LIMIT || 5);
    const { data: usage } = await db.from("ai_usage_daily").select("image_count").eq("usage_date", today).maybeSingle();
    let remaining = Math.max(0, imageLimit - Number(usage?.image_count || 0));
    if (!remaining) return NextResponse.json({ error: `Daily image limit reached (${imageLimit}).` }, { status: 429 });

    const body = await request.json().catch(() => ({}));
    const requestedId = String(body.articleId || "").trim();
    let query = db.from("articles").select("id,title,excerpt,category,cover_image_url").is("cover_image_url", null).order("created_at", { ascending:false }).limit(Math.min(remaining, 5));
    if (requestedId) query = db.from("articles").select("id,title,excerpt,category,cover_image_url").eq("id", requestedId).is("cover_image_url", null).limit(1);
    const { data: articles, error } = await query;
    if (error) throw new Error(`Article lookup failed: ${error.message}`);
    if (!articles?.length) return NextResponse.json({ ok:true, generated:0, message:"No articles are missing a cover image." });

    const results:any[] = [];
    for (const article of articles.slice(0, remaining)) {
      try {
        const bytes = await generateImage(key, article.title, article.category || "Trending", article.excerpt || "");
        const path = `ai-generated/${article.id}-${crypto.randomUUID()}.png`;
        const upload = await db.storage.from("article-images").upload(path, bytes, { contentType:"image/png", upsert:false });
        if (upload.error) throw new Error(`Storage upload failed: ${upload.error.message}`);
        const publicUrl = db.storage.from("article-images").getPublicUrl(path).data.publicUrl;
        const update = await db.from("articles").update({ cover_image_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", article.id);
        if (update.error) throw new Error(`Article update failed: ${update.error.message}`);
        const usageUpdate = await db.rpc("record_ai_usage", { p_kind:"image" });
        if (usageUpdate.error) throw new Error(`Usage update failed: ${usageUpdate.error.message}`);
        results.push({ id:article.id, title:article.title, ok:true });
      } catch (e:any) {
        results.push({ id:article.id, title:article.title, ok:false, error:e?.message || "Image generation failed." });
      }
    }

    const failed = results.filter(x => !x.ok);
    return NextResponse.json({ ok:true, generated:results.filter(x=>x.ok).length, results, message: failed.length ? "Image backfill finished with some errors." : "Missing article images generated successfully." });
  } catch (e:any) {
    return NextResponse.json({ error:e?.message || "Image backfill failed." }, { status:e?.message?.includes("Admin") ? 403 : 500 });
  }
}
