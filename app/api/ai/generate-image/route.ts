import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/server";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const { prompt } = await request.json();
    if (!prompt) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    const key = process.env.GEMINI_API_KEY;
    if (!key) return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 503 });

    const db = serviceClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await db.from("ai_usage_daily").select("image_count").eq("usage_date", today).maybeSingle();
    const imageLimit = Number(process.env.DAILY_IMAGE_LIMIT || 5);
    if ((usage?.image_count || 0) >= imageLimit) return NextResponse.json({ error: `Daily image limit reached (${imageLimit}).` }, { status: 429 });

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        model: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
        input: String(prompt).slice(0, 3000),
        response_format: { type: "image", aspect_ratio: "16:9", image_size: "1K" }
      })
    });
    if (!response.ok) throw new Error(`Gemini image request failed: ${await response.text()}`);
    const data = await response.json();
    const b64 = data.output_image?.data || data.output?.find((x:any)=>x?.type === "image")?.data;
    if (!b64) throw new Error("Gemini returned no image.");

    const path = `ai-generated/${crypto.randomUUID()}.png`;
    const up = await db.storage.from("prompt-images").upload(path, Buffer.from(b64, "base64"), { contentType: "image/png", upsert: false });
    if (up.error) throw up.error;
    await db.rpc("record_ai_usage", { p_kind: "image" });
    return NextResponse.json({ url: db.storage.from("prompt-images").getPublicUrl(path).data.publicUrl });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Image generation failed." }, { status: 500 });
  }
}
