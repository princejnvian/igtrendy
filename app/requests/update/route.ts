import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json();

  const requestId = body.requestId;
  const status = body.status;

  if (!requestId || !["accepted", "declined"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }

  const { data: projectRequest, error: fetchError } =
    await supabase
      .from("project_requests")
      .select("id, creator_id, status")
      .eq("id", requestId)
      .maybeSingle();

  if (fetchError || !projectRequest) {
    return NextResponse.json(
      { error: "Project request not found" },
      { status: 404 }
    );
  }

  // Only the creator who received the request can update it
  if (projectRequest.creator_id !== user.id) {
    return NextResponse.json(
      { error: "You are not allowed to update this request" },
      { status: 403 }
    );
  }

  // Only pending requests can be accepted or declined
  if (projectRequest.status !== "pending") {
    return NextResponse.json(
      { error: "This request has already been processed" },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("project_requests")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("creator_id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    status,
  });
}