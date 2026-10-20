import { NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const paymentId = String(body?.razorpay_payment_id || "");
    const orderId = String(body?.razorpay_order_id || "");
    const signature = String(body?.razorpay_signature || "");
    if (!paymentId || !orderId || !signature) return NextResponse.json({ error: "Missing Razorpay payment details." }, { status: 400 });

    const { data: checkout, error: checkoutError } = await supabaseAdmin
      .from("checkout_orders")
      .select("*")
      .eq("id", id)
      .eq("client_id", user.id)
      .maybeSingle();

    if (checkoutError || !checkout) return NextResponse.json({ error: "Checkout order not found." }, { status: 404 });
    if (checkout.status === "paid" && checkout.project_id) return NextResponse.json({ success: true, projectId: checkout.project_id });
    if (checkout.status !== "created") return NextResponse.json({ error: "This checkout is already being processed. Please refresh in a moment." }, { status: 409 });
    if (checkout.razorpay_order_id !== orderId) return NextResponse.json({ error: "Razorpay order does not match this checkout." }, { status: 400 });

    const { data: claim } = await supabaseAdmin
      .from("checkout_orders")
      .update({ status: "processing" })
      .eq("id", checkout.id)
      .eq("status", "created")
      .select("id")
      .maybeSingle();
    if (!claim) return NextResponse.json({ error: "This checkout is already being processed. Please refresh in a moment." }, { status: 409 });

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return NextResponse.json({ error: "Payment system is not configured." }, { status: 500 });

    const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.fetch(orderId);
    const payment = await razorpay.payments.fetch(paymentId);
    const expectedPaise = Math.round((Number(checkout.package_price) + Number(checkout.platform_fee)) * 100);

    if (order.id !== orderId || order.currency !== "INR" || Number(order.amount) !== expectedPaise) return NextResponse.json({ error: "Razorpay order details do not match this checkout." }, { status: 400 });
    if (payment.order_id !== orderId || payment.currency !== "INR" || Number(payment.amount) !== expectedPaise || payment.status !== "captured") return NextResponse.json({ error: "Payment has not been captured correctly." }, { status: 400 });

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + Number(checkout.delivery_days));

    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .insert({
        request_id: null,
        client_id: checkout.client_id,
        freelancer_id: checkout.freelancer_id,
        title: checkout.gig_title ? `${checkout.gig_title} — ${checkout.package_name}` : checkout.package_name,
        description: checkout.package_description,
        budget: checkout.package_price,
        deadline: deadline.toISOString().slice(0, 10),
        status: "active",
      })
      .select("id")
      .single();

    if (projectError || !project) {
      console.error("Project creation after payment failed:", projectError);
      return NextResponse.json({ error: "Payment was captured but the order could not be created. Please contact support with your Razorpay payment ID." }, { status: 500 });
    }

    const { data: savedPayment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        project_id: project.id,
        client_id: checkout.client_id,
        freelancer_id: checkout.freelancer_id,
        amount: Number(checkout.package_price) + Number(checkout.platform_fee),
        project_amount: checkout.package_price,
        platform_fee: checkout.platform_fee,
        escrow_status: "funded",
        currency: "INR",
        status: "paid",
        payment_gateway: "razorpay",
        gateway_payment_id: paymentId,
        gateway_order_id: orderId,
        paid_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (paymentError || !savedPayment) {
      await supabaseAdmin.from("projects").delete().eq("id", project.id);
      console.error("Payment ledger creation failed:", paymentError);
      return NextResponse.json({ error: "Payment was captured but the order ledger could not be created." }, { status: 500 });
    }

    const { error: holdError } = await supabaseAdmin.rpc("hold_project_payment", { p_payment_id: savedPayment.id });
    if (holdError) {
      console.error("Escrow ledger hold failed:", holdError);
      return NextResponse.json({ error: "Payment was captured, but the escrow ledger could not be initialized. Contact support." }, { status: 500 });
    }

    await supabaseAdmin
      .from("checkout_orders")
      .update({ status: "paid", paid_at: new Date().toISOString(), project_id: project.id })
      .eq("id", checkout.id);

    return NextResponse.json({ success: true, projectId: project.id });
  } catch (error) {
    console.error("Checkout confirmation error:", error);
    return NextResponse.json({ error: "Something went wrong while confirming payment." }, { status: 500 });
  }
}