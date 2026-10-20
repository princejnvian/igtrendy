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

  try {
    const body = await request.json();

    const {
      project_id,
      message,
      file_url,
    } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: "Project ID is required." },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Delivery message is required." },
        { status: 400 }
      );
    }

    // Check project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        id,
        client_id,
        freelancer_id,
        status
      `)
      .eq("id", project_id)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    // Only freelancer can submit delivery
    if (project.freelancer_id !== user.id) {
      return NextResponse.json(
        { error: "Only the freelancer can submit a delivery." },
        { status: 403 }
      );
    }

    // Project must be active
    if (project.status !== "active") {
      return NextResponse.json(
        { error: "This project is not active." },
        { status: 400 }
      );
    }

    // Create delivery
    const { data: delivery, error: deliveryError } = await supabase
      .from("project_deliveries")
      .insert({
        project_id: project.id,
        freelancer_id: user.id,
        message: message.trim(),
        file_url: file_url?.trim() || null,
        status: "submitted",
      })
      .select()
      .single();

    if (deliveryError) {
      console.error("Delivery creation error:", deliveryError);

      return NextResponse.json(
        { error: deliveryError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      delivery,
    });

  } catch (error) {
    console.error("Delivery API error:", error);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}