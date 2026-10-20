import { NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { calculatePlatformFee } from "@/lib/platform-fee";

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
    // =========================================
    // AUTHENTICATE USER
    // =========================================

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    // =========================================
    // GET PROJECT ID
    // =========================================

    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        {
          error: "Project ID is required",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // GET PAYMENT DATA FROM REQUEST
    // =========================================

    const body = await request.json();

    const razorpayPaymentId =
      body?.razorpay_payment_id?.toString().trim();

    const razorpayOrderId =
      body?.razorpay_order_id?.toString().trim();

    const razorpaySignature =
      body?.razorpay_signature?.toString().trim();

    if (
      !razorpayPaymentId ||
      !razorpayOrderId ||
      !razorpaySignature
    ) {
      return NextResponse.json(
        {
          error: "Missing Razorpay payment details",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // ENV CHECK
    // =========================================

    const razorpayKeyId =
      process.env.RAZORPAY_KEY_ID;

    const razorpayKeySecret =
      process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error(
        "Razorpay environment variables are missing"
      );

      return NextResponse.json(
        {
          error: "Payment system is not configured",
        },
        {
          status: 500,
        }
      );
    }

    // =========================================
    // GET PROJECT USING ADMIN CLIENT
    // =========================================
    // IMPORTANT:
    // Admin client bypasses RLS.
    // We manually verify that the authenticated
    // user is the client of this project.
    // =========================================

    const {
      data: project,
      error: projectError,
    } = await supabaseAdmin
      .from("projects")
      .select(`
        id,
        client_id,
        freelancer_id,
        title,
        budget,
        status
      `)
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) {
      console.error(
        "Project fetch error:",
        projectError
      );

      return NextResponse.json(
        {
          error: "Unable to verify project",
        },
        {
          status: 500,
        }
      );
    }

    if (!project) {
      return NextResponse.json(
        {
          error: "Project not found",
        },
        {
          status: 404,
        }
      );
    }

    // =========================================
    // CLIENT OWNERSHIP CHECK
    // =========================================

    if (project.client_id !== user.id) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to make this payment",
        },
        {
          status: 403,
        }
      );
    }

    // =========================================
    // PROJECT STATUS CHECK
    // =========================================

    if (!["pending_payment", "active"].includes(project.status)) {
      return NextResponse.json(
        {
          error:
            "Payment is only allowed for unpaid projects",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // PROJECT BUDGET CHECK
    // =========================================

    if (
      project.budget === null ||
      project.budget === undefined
    ) {
      return NextResponse.json(
        {
          error: "Project budget is not specified",
        },
        {
          status: 400,
        }
      );
    }

    const projectAmount = Number(project.budget);
    const platformFee = calculatePlatformFee(projectAmount);
    const totalAmount = projectAmount + platformFee;

    if (
      !Number.isFinite(projectAmount) ||
      projectAmount <= 0
    ) {
      return NextResponse.json(
        {
          error: "Invalid project budget",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // RAZORPAY CLIENT
    // =========================================

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    // =========================================
    // FETCH ORDER DIRECTLY FROM RAZORPAY
    // =========================================

    const razorpayOrder =
      await razorpay.orders.fetch(
        razorpayOrderId
      );

    // =========================================
    // VERIFY ORDER ID
    // =========================================

    if (razorpayOrder.id !== razorpayOrderId) {
      return NextResponse.json(
        {
          error: "Invalid Razorpay order",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // VERIFY PROJECT ID FROM ORDER NOTES
    // =========================================

    const orderProjectId =
      razorpayOrder.notes?.project_id;

    if (orderProjectId !== project.id) {
      return NextResponse.json(
        {
          error:
            "Razorpay order does not belong to this project",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // VERIFY ORDER AMOUNT
    // =========================================

    const expectedAmountPaise = Math.round(
      totalAmount * 100
    );

    if (
      Number(razorpayOrder.amount) !==
      expectedAmountPaise
    ) {
      return NextResponse.json(
        {
          error:
            "Razorpay order amount does not match the payable total",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // VERIFY ORDER CURRENCY
    // =========================================

    if (razorpayOrder.currency !== "INR") {
      return NextResponse.json(
        {
          error: "Invalid payment currency",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // VERIFY RAZORPAY SIGNATURE
    // =========================================

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          razorpayKeySecret
        )
        .update(
          `${razorpayOrder.id}|${razorpayPaymentId}`
        )
        .digest("hex");

    const generatedBuffer = Buffer.from(generatedSignature);
    const receivedBuffer = Buffer.from(razorpaySignature);
    const signatureIsValid =
      generatedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(generatedBuffer, receivedBuffer);

    if (!signatureIsValid) {
      return NextResponse.json(
        {
          error:
            "Payment signature verification failed",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // FETCH PAYMENT DIRECTLY FROM RAZORPAY
    // =========================================

    const razorpayPayment =
      await razorpay.payments.fetch(
        razorpayPaymentId
      );

    // =========================================
    // VERIFY PAYMENT ORDER
    // =========================================

    if (
      razorpayPayment.order_id !==
      razorpayOrder.id
    ) {
      return NextResponse.json(
        {
          error:
            "Payment does not belong to this order",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // VERIFY PAYMENT AMOUNT
    // =========================================

    if (
      Number(razorpayPayment.amount) !==
      expectedAmountPaise
    ) {
      return NextResponse.json(
        {
          error:
            "Payment amount does not match the payable total",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // VERIFY PAYMENT CURRENCY
    // =========================================

    if (razorpayPayment.currency !== "INR") {
      return NextResponse.json(
        {
          error: "Invalid payment currency",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // VERIFY PAYMENT STATUS
    // =========================================

    if (razorpayPayment.status !== "captured") {
      return NextResponse.json(
        {
          error:
            "Payment has not been captured yet",
          status: razorpayPayment.status,
        },
        {
          status: 400,
        }
      );
    }

    // =========================================
    // CHECK EXISTING PAYMENT
    // =========================================

    const {
      data: existingPayment,
      error: existingPaymentError,
    } = await supabaseAdmin
      .from("payments")
      .select(`
        id,
        project_id,
        client_id,
        freelancer_id,
        amount,
        currency,
        status,
        payment_gateway,
        gateway_payment_id,
        gateway_order_id,
        paid_at,
        project_amount,
        platform_fee
      `)
      .eq("project_id", project.id)
      .maybeSingle();

    if (existingPaymentError) {
      console.error(
        "Existing payment lookup error:",
        existingPaymentError
      );

      return NextResponse.json(
        {
          error:
            "Unable to check existing payment",
        },
        {
          status: 500,
        }
      );
    }

    // The stored payment/order must match the Razorpay order we are verifying.
    if (
      existingPayment?.gateway_order_id &&
      existingPayment.gateway_order_id !== razorpayOrder.id
    ) {
      return NextResponse.json(
        { error: "Razorpay order does not match the initialized payment." },
        { status: 400 }
      );
    }

    // =========================================
    // PAYMENT DATA
    // =========================================

    const paymentData = {
      project_id: project.id,
      client_id: project.client_id,
      freelancer_id: project.freelancer_id,
      amount: totalAmount,
      project_amount: projectAmount,
      platform_fee: platformFee,
      escrow_status: "funded",
      currency: "INR",
      status: "paid",
      payment_gateway: "razorpay",
      gateway_payment_id:
        razorpayPaymentId,
      gateway_order_id:
        razorpayOrder.id,
      paid_at:
        existingPayment?.paid_at ||
        new Date().toISOString(),
    };

    // =========================================
    // SAVE PAYMENT USING ADMIN CLIENT
    // =========================================

    if (existingPayment) {
      const {
        error: updateError,
      } = await supabaseAdmin
        .from("payments")
        .update(paymentData)
        .eq("id", existingPayment.id);

      if (updateError) {
        console.error(
          "Payment update error:",
          updateError
        );

        return NextResponse.json(
          {
            error:
              "Payment verified but could not be saved",
          },
          {
            status: 500,
          }
        );
      }
    } else {
      const {
        error: insertError,
      } = await supabaseAdmin
        .from("payments")
        .insert(paymentData);

      if (insertError) {
        console.error(
          "Payment insert error:",
          insertError
        );

        return NextResponse.json(
          {
            error:
              "Payment verified but could not be saved",
          },
          {
            status: 500,
          }
        );
      }
    }

    // Payment is now captured. Activate the project workspace only after verification.
    const { error: activateError } = await supabaseAdmin
      .from("projects")
      .update({ status: "active" })
      .eq("id", project.id)
      .eq("client_id", user.id)
      .in("status", ["pending_payment", "active"]);

    if (activateError) {
      console.error("Project activation error:", activateError);
      return NextResponse.json({ error: "Payment verified but project activation failed" }, { status: 500 });
    }

    // Hold the captured project amount atomically and idempotently.
    // This prevents webhook + browser verification races from double-crediting escrow.
    const { data: savedPayment, error: savedPaymentLookupError } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("project_id", project.id)
      .maybeSingle();

    if (savedPaymentLookupError || !savedPayment) {
      console.error("Saved payment lookup error:", savedPaymentLookupError);
      return NextResponse.json(
        { error: "Payment was verified, but escrow could not be initialized." },
        { status: 500 }
      );
    }

    const { error: holdError } = await supabaseAdmin.rpc("hold_project_payment", {
      p_payment_id: savedPayment.id,
    });

    if (holdError) {
      console.error("Payment escrow hold error:", holdError);
      return NextResponse.json(
        { error: "Payment was verified, but escrow could not be initialized." },
        { status: 500 }
      );
    }

    // =========================================
    // SUCCESS
    // =========================================

    return NextResponse.json({
      success: true,
      status: "paid",
      paymentId: razorpayPaymentId,
      orderId: razorpayOrder.id,
    });
  } catch (error) {
    console.error(
      "Payment verification error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while verifying payment",
      },
      {
        status: 500,
      }
    );
  }
}