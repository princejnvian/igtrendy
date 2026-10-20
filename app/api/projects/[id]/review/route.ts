import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const rating = Number(body?.rating);
  const comment = String(body?.comment || "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });

  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .select("id, client_id, freelancer_id, status")
    .eq("id", id).maybeSingle();
  if (error || !project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (project.client_id !== user.id) return NextResponse.json({ error: "Only the client can review this project." }, { status: 403 });
  if (project.status !== "completed") return NextResponse.json({ error: "Project must be completed before review." }, { status: 400 });

  const { error: insertError } = await supabaseAdmin.from("reviews").insert({
    project_id: project.id,
    reviewer_id: user.id,
    freelancer_id: project.freelancer_id,
    rating,
    comment: comment || null,
  });
  if (insertError) {
    if (insertError.code === "23505") return NextResponse.json({ error: "You have already reviewed this project." }, { status: 409 });
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
