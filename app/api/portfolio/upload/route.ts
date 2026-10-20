import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_SIZE = 30 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
  "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4",
]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Please select a file." }, { status: 400 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Supported formats: JPG, PNG, WEBP, GIF, MP4, WEBM, MOV, MP3, WAV and OGG." }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Portfolio files must be 30MB or smaller." }, { status: 400 });

    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-80);
    const path = `${user.id}/${Date.now()}-${safeName || "portfolio-file"}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage.from("portfolio-media").upload(path, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) return NextResponse.json({ error: "Unable to upload this portfolio file." }, { status: 500 });

    const { data } = supabaseAdmin.storage.from("portfolio-media").getPublicUrl(path);
    return NextResponse.json({ success: true, url: data.publicUrl, mediaType: file.type.split("/")[0], name: file.name });
  } catch (error) {
    console.error("Portfolio upload error:", error);
    return NextResponse.json({ error: "Something went wrong while uploading the file." }, { status: 500 });
  }
}
