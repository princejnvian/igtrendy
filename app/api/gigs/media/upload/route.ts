import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_SIZE = 30 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    const gigId = String(formData.get("gigId") || "").trim();
    const packageId = String(formData.get("packageId") || "").trim();
    if (!(file instanceof File)) return NextResponse.json({ error: "Please select an image or video." }, { status: 400 });
    if (!gigId) return NextResponse.json({ error: "Gig ID is required." }, { status: 400 });
    if (!packageId) return NextResponse.json({ error: "Package ID is required." }, { status: 400 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Supported formats: JPG, PNG, WEBP, GIF, MP4, WEBM and MOV." }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Gig media must be 30MB or smaller." }, { status: 400 });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("account_type")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.account_type !== "freelancer") return NextResponse.json({ error: "Only freelancers can add gig media." }, { status: 403 });

    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-80);
    const path = `gigs/${user.id}/${gigId}/${packageId}/${Date.now()}-${safeName || "package-media"}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage.from("portfolio-media").upload(path, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) return NextResponse.json({ error: "Unable to upload this gig media." }, { status: 500 });

    const { data } = supabaseAdmin.storage.from("portfolio-media").getPublicUrl(path);
    const media = {
      id: crypto.randomUUID(),
      url: data.publicUrl,
      path,
      mediaType: file.type.startsWith("video/") ? "video" : "image",
      title: file.name,
    };

    // Persist the uploaded media on the gig itself. This is the source of truth
    // for public gig pages, so a refresh never loses a successfully uploaded file.
    const { data: currentProfile, error: profileReadError } = await supabaseAdmin
      .from("profiles")
      .select("gigs")
      .eq("id", user.id)
      .maybeSingle();

    if (profileReadError) {
      await supabaseAdmin.storage.from("portfolio-media").remove([path]);
      return NextResponse.json({ error: "Media uploaded but the gig could not be loaded for saving." }, { status: 500 });
    }

    const gigs = Array.isArray(currentProfile?.gigs) ? currentProfile.gigs.map((gig: any) => ({ ...gig })) : [];
    const gigIndex = gigs.findIndex((gig: any) => gig?.id === gigId);
    if (gigIndex < 0) {
      await supabaseAdmin.storage.from("portfolio-media").remove([path]);
      return NextResponse.json({ error: "Gig not found. Please refresh the profile and try again." }, { status: 404 });
    }

    const gig = gigs[gigIndex];
    const packages = Array.isArray(gig?.packages) ? gig.packages.map((pkg: any) => ({ ...pkg })) : [];
    const packageIndex = packages.findIndex((pkg: any) => pkg?.id === packageId);
    if (packageIndex < 0) {
      await supabaseAdmin.storage.from("portfolio-media").remove([path]);
      return NextResponse.json({ error: "Package not found. Please refresh the profile and try again." }, { status: 404 });
    }

    const existingMedia = Array.isArray(packages[packageIndex]?.media) ? packages[packageIndex].media : [];
    if (existingMedia.length >= 6) {
      await supabaseAdmin.storage.from("portfolio-media").remove([path]);
      return NextResponse.json({ error: "You can add up to 6 photos/videos to each package." }, { status: 400 });
    }

    packages[packageIndex] = { ...packages[packageIndex], media: [...existingMedia, media] };
    gigs[gigIndex] = { ...gig, packages };
    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({ gigs, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (profileUpdateError) {
      await supabaseAdmin.storage.from("portfolio-media").remove([path]);
      console.error("Gig media profile save error:", profileUpdateError);
      return NextResponse.json({ error: "Media uploaded but could not be attached to the gig." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: media.url,
      path: media.path,
      mediaType: media.mediaType,
      name: media.title,
      packageId,
      media,
    });
  } catch (error) {
    console.error("Gig media upload error:", error);
    return NextResponse.json({ error: "Something went wrong while uploading the gig media." }, { status: 500 });
  }
}
