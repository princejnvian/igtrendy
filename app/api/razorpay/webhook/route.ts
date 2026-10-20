import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Razorpay webhook secret is missing");

      return NextResponse.json(
        { error: "Webhook is not configured" },
        { status: 500 }
      );
    }

    // Read raw body exactly as Razorpay sent it
    const rawBody = await request.text();

    const signature = request.headers.get(
      "x-razorpay-signature"
    );

    if (!signature) {
      return NextResponse.json(
        { error: "Missing Razorpay signature" },
        { status: 400 }
      );
    }

    // Verify Razorpay webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("Invalid Razorpay webhook signature");

      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody);

    console.log(
      "Razorpay webhook received:",
      event.event
    );

    const supabase = supabaseAdmin;

    /*
     * We are mainly interested in successful
     * captured payments.
     */
    if (event.event === "payment.captured") {
      const paymentEntity = event.payload?.payment?.entity;

      if (!paymentEntity) {
        return NextResponse.json(
          { error: "Payment data missing" },
          { status: 400 }
        );
      }

      const razorpayPaymentId = paymentEntity.id;
      const razorpayOrderId = paymentEntity.order_id;

      if (!razorpayPaymentId || !razorpayOrderId) {
        return NextResponse.json(
          { error: "Payment information is incomplete" },
          { status: 400 }
        );
      }

      /*
       * Find the Crevo payment using the Razorpay order ID.
       */
      const { data: payment, error: paymentLookupError } =
        await supabase
          .from("payments")
          .select("id, project_id, status, freelancer_id, amount, project_amount")
          .eq(
            "gateway_order_id",
            razorpayOrderId
          )
          .maybeSingle();

      if (paymentLookupError) {
        console.error(
          "Webhook payment lookup error:",
          paymentLookupError
        );

        return NextResponse.json(
          { error: "Unable to find payment" },
          { status: 500 }
        );
      }

      /*
       * Payment may already be marked paid by the
       * normal Checkout verification route.
       */
      if (!payment) {
        // New gig checkout flow: the project/payment ledger is created only
        // after Razorpay confirms capture. This removes the old request
        // acceptance step from direct gig orders.
        const { data: checkout } = await supabase
          .from("checkout_orders")
          .select("*")
          .eq("razorpay_order_id", razorpayOrderId)
          .maybeSingle();

        if (checkout) {
          if (checkout.status === "paid" && checkout.project_id) {
            return NextResponse.json({ success: true, received: true });
          }
          if (checkout.status !== "created") {
            return NextResponse.json({ success: true, received: true });
          }

          const { data: claim } = await supabase
            .from("checkout_orders")
            .update({ status: "processing" })
            .eq("id", checkout.id)
            .eq("status", "created")
            .select("id")
            .maybeSingle();
          if (!claim) return NextResponse.json({ success: true, received: true });

          const projectAmount = Number(checkout.package_price);
          const platformFee = Number(checkout.platform_fee);
          const totalAmount = projectAmount + platformFee;
          if (!Number.isFinite(projectAmount) || projectAmount <= 0) {
            return NextResponse.json({ error: "Invalid checkout amount" }, { status: 400 });
          }

          const expectedPaise = Math.round(totalAmount * 100);
          if (Number(paymentEntity.amount) !== expectedPaise || paymentEntity.currency !== "INR") {
            return NextResponse.json({ error: "Checkout payment amount mismatch" }, { status: 400 });
          }

          const deadline = new Date();
          deadline.setDate(deadline.getDate() + Number(checkout.delivery_days));

          const { data: project, error: projectError } = await supabase
            .from("projects")
            .insert({
              request_id: null,
              client_id: checkout.client_id,
              freelancer_id: checkout.freelancer_id,
              title: checkout.gig_title ? `${checkout.gig_title} — ${checkout.package_name}` : checkout.package_name,
              description: checkout.package_description,
              budget: projectAmount,
              deadline: deadline.toISOString().slice(0, 10),
              status: "active",
            })
            .select("id")
            .single();

          if (projectError || !project) {
            console.error("Webhook checkout project creation error:", projectError);
            return NextResponse.json({ error: "Unable to create paid project" }, { status: 500 });
          }

          const { data: savedPayment, error: paymentInsertError } = await supabase
            .from("payments")
            .insert({
              project_id: project.id,
              client_id: checkout.client_id,
              freelancer_id: checkout.freelancer_id,
              amount: totalAmount,
              project_amount: projectAmount,
              platform_fee: platformFee,
              escrow_status: "funded",
              currency: "INR",
              status: "paid",
              payment_gateway: "razorpay",
              gateway_payment_id: razorpayPaymentId,
              gateway_order_id: razorpayOrderId,
              paid_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (paymentInsertError || !savedPayment) {
            await supabase.from("projects").delete().eq("id", project.id);
            console.error("Webhook checkout payment insert error:", paymentInsertError);
            return NextResponse.json({ error: "Unable to create payment ledger" }, { status: 500 });
          }

          const { error: holdError } = await supabase.rpc("hold_project_payment", { p_payment_id: savedPayment.id });
          if (holdError) {
            console.error("Webhook checkout escrow hold error:", holdError);
            return NextResponse.json({ error: "Unable to initialize escrow hold" }, { status: 500 });
          }

          await supabase
            .from("checkout_orders")
            .update({ status: "paid", paid_at: new Date().toISOString(), project_id: project.id })
            .eq("id", checkout.id);

          return NextResponse.json({ success: true, received: true, projectId: project.id });
        }

        console.log("No YOUTENT payment or checkout found for Razorpay order:", razorpayOrderId);
        return NextResponse.json({
          success: true,
          message: "Webhook received; payment not found yet",
        });
      }

      if (payment.status !== "paid") {
        const { error: updateError } =
          await supabase
            .from("payments")
            .update({
              status: "paid",
              escrow_status: "funded",
              gateway_payment_id: razorpayPaymentId,
              paid_at: new Date().toISOString(),
            })
            .eq("id", payment.id);

        if (updateError) {
          console.error(
            "Webhook payment update error:",
            updateError
          );

          return NextResponse.json(
            { error: "Unable to update payment" },
            { status: 500 }
          );
        }

        const { error: holdError } = await supabase.rpc("hold_project_payment", { p_payment_id: payment.id });
        if (holdError) {
          console.error("Webhook escrow hold error:", holdError);
          return NextResponse.json({ error: "Unable to initialize escrow hold" }, { status: 500 });
        }

        await supabase
          .from("projects")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", payment.project_id)
          .in("status", ["pending_payment", "active"]);

        console.log(
          "Payment marked as paid by webhook:",
          payment.id
        );
      }
    }

    /*
     * payment.failed
     */
    if (event.event === "payment.failed") {
      const paymentEntity = event.payload?.payment?.entity;

      if (paymentEntity?.order_id) {
        console.log(
          "Razorpay payment failed for order:",
          paymentEntity.order_id
        );
      }
    }

    return NextResponse.json({
      success: true,
      received: true,
    });
  } catch (error) {
    console.error(
      "Razorpay webhook error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}