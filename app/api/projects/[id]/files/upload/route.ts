import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, client_id, freelancer_id")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (project.client_id !== user.id && project.freelancer_id !== user.id) {
      return NextResponse.json({ error: "You are not allowed to upload files to this project." }, { status: 403 });
    }

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("status")
      .eq("project_id", projectId)
      .maybeSingle();

    if (payment?.status !== "paid") {
      return NextResponse.json(
        { error: "File sharing becomes available after the client completes payment." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please choose a file first." }, { status: 400 });
    }

    const maxBytes = 50 * 1024 * 1024;
    if (file.size <= 0 || file.size > maxBytes) {
      return NextResponse.json({ error: "File size must be between 1 byte and 50 MB." }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 160);
    const filePath = `${projectId}/${Date.now()}-${safeName || "project-file"}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("project-files")
      .upload(filePath, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("Project file upload error:", uploadError);
      return NextResponse.json({ error: "Unable to upload this file." }, { status: 500 });
    }

    return NextResponse.json({ success: true, path: filePath, name: safeName });
  } catch (error) {
    console.error("Project file upload error:", error);
    return NextResponse.json({ error: "Something went wrong while uploading." }, { status: 500 });
  }
}
