import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeGigs } from "@/lib/gigs";
import { calculatePlatformFee } from "@/lib/platform-fee";



export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please log in to place an order." }, { status: 401 });

    const body = await request.json();
    const freelancerId = String(body?.freelancerId || "");
    const gigId = String(body?.gigId || "");
    const packageId = String(body?.packageId || "");
    if (!freelancerId || !gigId || !packageId) {
      return NextResponse.json({ error: "Creator, gig and package are required." }, { status: 400 });
    }
    if (freelancerId === user.id) {
      return NextResponse.json({ error: "You cannot order your own gig." }, { status: 400 });
    }

    const { data: freelancer, error: freelancerError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, username, account_type, service_packages, gigs, starting_price, primary_category, categories")
      .eq("id", freelancerId)
      .eq("account_type", "freelancer")
      .maybeSingle();

    if (freelancerError || !freelancer) {
      return NextResponse.json({ error: "Freelancer not found." }, { status: 404 });
    }

    const gigs = normalizeGigs(freelancer.gigs, freelancer.service_packages, freelancer.primary_category || freelancer.categories?.[0]);
    const gig = gigs.find((item) => String(item.id) === gigId);
    const selected = gig?.packages.find((item) => String(item.id) === packageId);
    if (!gig || !selected) {
      return NextResponse.json({ error: "This gig or package is no longer available." }, { status: 409 });
    }

    const price = Number(selected.price);
    const deliveryDays = Number(selected.deliveryDays);
    const revisions = Number(selected.revisions);
    if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(deliveryDays) || deliveryDays < 1 || deliveryDays > 365) {
      return NextResponse.json({ error: "This gig package has invalid pricing details." }, { status: 400 });
    }

    const platformFee = calculatePlatformFee(price);
    const totalAmount = price + platformFee;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Razorpay is not configured on the server." }, { status: 500 });
    }

    const { data: checkout, error: checkoutError } = await supabaseAdmin
      .from("checkout_orders")
      .insert({
        client_id: user.id,
        freelancer_id: freelancer.id,
        gig_id: String(gig.id),
        gig_title: String(gig.title || "Gig"),
        package_id: String(selected.id),
        package_name: String(selected.name || "Gig"),
        package_description: [
          String(selected.description || "").trim(),
          selected.scope ? `Scope / quantity: ${String(selected.scope).trim()}` : "",
          selected.includes ? `What's included: ${String(selected.includes).trim()}` : "",
        ].filter(Boolean).join("\n\n").slice(0, 1800),
        package_price: price,
        delivery_days: deliveryDays,
        revisions: Number.isFinite(revisions) ? Math.max(0, Math.min(50, revisions)) : 0,
        platform_fee: platformFee,
        status: "created",
      })
      .select("id")
      .single();

    if (checkoutError || !checkout) {
      console.error("Checkout creation error:", checkoutError);
      return NextResponse.json({ error: "Unable to start checkout." }, { status: 500 });
    }

    try {
      const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const order = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: `youtent_${checkout.id.replace(/-/g, "").slice(0, 24)}`,
        notes: {
          checkout_id: checkout.id,
          client_id: user.id,
          freelancer_id: freelancer.id,
          gig_id: String(gig.id),
        gig_title: String(gig.title || "Gig"),
        package_id: String(selected.id),
          project_amount: price.toFixed(2),
          platform_fee: platformFee.toFixed(2),
        },
      });

      const { error: orderUpdateError } = await supabaseAdmin
        .from("checkout_orders")
        .update({ razorpay_order_id: order.id })
        .eq("id", checkout.id);

      if (orderUpdateError) {
        await supabaseAdmin.from("checkout_orders").delete().eq("id", checkout.id);
        console.error("Checkout order ID save error:", orderUpdateError);
        return NextResponse.json({ error: "Unable to initialize payment." }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        checkoutId: checkout.id,
        orderId: order.id,
        keyId,
        amount: order.amount,
        currency: order.currency,
        packageName: selected.name,
        packagePrice: price,
        platformFee,
        totalAmount,
        deliveryDays,
        revisions,
      });
    } catch (error) {
      await supabaseAdmin.from("checkout_orders").delete().eq("id", checkout.id);
      throw error;
    }
  } catch (error) {
    console.error("Checkout order API error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start checkout." }, { status: 500 });
  }
}