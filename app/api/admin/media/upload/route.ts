import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/server";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Only JPG, PNG, or WebP images are allowed." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be 8 MB or smaller." }, { status: 400 });

    const db = serviceClient();
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `manual/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
    const upload = await db.storage.from("article-images").upload(path, bytes, { contentType: file.type, upsert: false });
    if (upload.error) throw new Error(`Image upload failed: ${upload.error.message}`);
    const publicUrl = db.storage.from("article-images").getPublicUrl(path).data.publicUrl;
    return NextResponse.json({ ok: true, url: publicUrl, path });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Image upload failed." }, { status: e?.message?.includes("Admin") ? 403 : 500 });
  }
}
