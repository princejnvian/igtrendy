import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, client_id, freelancer_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (project.client_id !== user.id && project.freelancer_id !== user.id) return NextResponse.json({ error: "You are not allowed to delete this project." }, { status: 403 });
  if (project.status !== "completed") return NextResponse.json({ error: "Only completed projects can be deleted." }, { status: 400 });

  // Clean project storage before deleting the database row.
  const { data: files } = await supabaseAdmin.storage.from("project-files").list(id, { limit: 1000 });
  if (files?.length) {
    const paths = files.map((file) => `${id}/${file.name}`);
    await supabaseAdmin.storage.from("project-files").remove(paths);
  }

  const { error } = await supabaseAdmin.from("projects").delete().eq("id", id);
  if (error) {
    console.error("Completed project deletion error:", error);
    return NextResponse.json({ error: "Unable to delete the completed project." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}