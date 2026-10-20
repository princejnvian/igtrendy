import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: Props
) {
  try {
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

    const { id } = await params;

    // Read through the user's authenticated session so the request
    // itself is still protected by the normal marketplace RLS rules.
    const { data: projectRequest, error: fetchError } =
      await supabase
        .from("project_requests")
        .select(
          "id, client_id, creator_id, project_title, description, service, budget, deadline, status"
        )
        .eq("id", id)
        .maybeSingle();

    if (fetchError || !projectRequest) {
      return NextResponse.json(
        { error: "Project request not found." },
        { status: 404 }
      );
    }

    if (projectRequest.creator_id !== user.id) {
      return NextResponse.json(
        { error: "You are not allowed to accept this request." },
        { status: 403 }
      );
    }

    if (projectRequest.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been processed." },
        { status: 400 }
      );
    }

    // If a previous attempt already created the project, finish the
    // acceptance flow instead of trying to insert a duplicate project.
    const { data: existingProject } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("request_id", projectRequest.id)
      .maybeSingle();

    if (existingProject) {
      const { error: existingUpdateError } = await supabaseAdmin
        .from("project_requests")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("creator_id", user.id)
        .eq("status", "pending");

      if (existingUpdateError) {
        return NextResponse.json({ error: "Unable to accept this request. Please try again." }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        projectId: existingProject.id,
        redirectTo: `/projects/${existingProject.id}/payment`,
      });
    }

    /*
     * Project creation is a protected server-side operation.
     * The old flow used the user's RLS client for the projects INSERT,
     * which caused:
     * "new row violates row-level security policy for table projects".
     *
     * Use the service-role client only after the authenticated creator
     * has been verified above. This keeps the browser unable to write
     * projects directly while allowing this trusted server route to
     * complete the accept flow.
     */
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .insert({
        request_id: projectRequest.id,
        client_id: projectRequest.client_id,
        freelancer_id: projectRequest.creator_id,
        title: projectRequest.project_title,
        description: projectRequest.description,
        budget: projectRequest.budget,
        deadline: projectRequest.deadline,
        status: "pending_payment",
      })
      .select("id")
      .single();

    if (projectError || !project) {
      console.error("Project creation error:", projectError);

      return NextResponse.json(
        {
          error:
            projectError?.message ||
            "Unable to create the project workspace.",
        },
        { status: 500 }
      );
    }

    // Only mark the request accepted after the project exists.
    const { error: updateError } = await supabaseAdmin
      .from("project_requests")
      .update({
        status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("creator_id", user.id)
      .eq("status", "pending");

    if (updateError) {
      console.error("Request acceptance update error:", updateError);

      // Best-effort rollback so an accepted request cannot be left
      // without its corresponding project.
      await supabaseAdmin
        .from("projects")
        .delete()
        .eq("id", project.id);

      return NextResponse.json(
        { error: "Unable to accept this request. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
      redirectTo: `/projects/${project.id}/payment`,
    });
  } catch (error) {
    console.error("Accept request error:", error);

    return NextResponse.json(
      { error: "Something went wrong while accepting this request." },
      { status: 500 }
    );
  }
}
