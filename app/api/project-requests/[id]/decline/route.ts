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

    const { data: projectRequest, error: fetchError } =
      await supabase
        .from("project_requests")
        .select("id, creator_id, status")
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
        { error: "You are not allowed to decline this request." },
        { status: 403 }
      );
    }

    if (projectRequest.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been processed." },
        { status: 400 }
      );
    }

    /*
     * The previous implementation relied on the user's RLS UPDATE.
     * Keep authorization in the authenticated client above, then perform
     * the actual state transition server-side so the button cannot get
     * stuck on "Declining..." because of an RLS mismatch.
     */
    const { error: updateError } = await supabaseAdmin
      .from("project_requests")
      .update({
        status: "declined",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("creator_id", user.id)
      .eq("status", "pending");

    if (updateError) {
      console.error("Decline request error:", updateError);

      return NextResponse.json(
        { error: "Unable to decline this request. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "declined",
    });
  } catch (error) {
    console.error("Decline request error:", error);

    return NextResponse.json(
      { error: "Something went wrong while declining this request." },
      { status: 500 }
    );
  }
}
