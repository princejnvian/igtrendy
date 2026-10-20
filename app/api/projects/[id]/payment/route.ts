import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: Props) {
  try {
    const supabase = await createClient();

    // Check logged-in user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        id,
        client_id,
        freelancer_id,
        title,
        budget,
        status
      `)
      .eq("id", id)
      .maybeSingle();

    if (projectError) {
      console.error("Project fetch error:", projectError);

      return NextResponse.json(
        { error: "Unable to load project." },
        { status: 500 }
      );
    }

    if (!project) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    // Only project client can create payment
    if (project.client_id !== user.id) {
      return NextResponse.json(
        { error: "Only the project client can make the payment." },
        { status: 403 }
      );
    }

    // Validate budget
    const amount = Number(project.budget);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid project amount." },
        { status: 400 }
      );
    }

    // Razorpay environment variables
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Razorpay environment variables are missing.");

      return NextResponse.json(
        {
          error:
            "Razorpay keys are missing. Check your .env.local file.",
        },
        { status: 500 }
      );
    }

    // Create Razorpay instance
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Razorpay amount is in paise.
    // Example: ₹5000 = 500000 paise.
    const amountInPaise = Math.round(amount * 100);

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `crevo_${project.id.replace(/-/g, "").slice(0, 30)}`,
      notes: {
        project_id: project.id,
        client_id: project.client_id,
      },
    });

    console.log("Razorpay order created:", order.id);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      keyId,
      amount: amountInPaise,
      currency: "INR",
      projectId: project.id,
    });
  } catch (error: any) {
    console.error("Razorpay order creation error:", error);

    return NextResponse.json(
      {
        error:
          error?.error?.description ||
          error?.message ||
          "Unable to create Razorpay order.",
      },
      { status: 500 }
    );
  }
}