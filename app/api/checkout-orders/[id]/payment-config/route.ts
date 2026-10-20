import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { data: checkout } = await supabaseAdmin.from("checkout_orders").select("client_id,status").eq("id", id).maybeSingle();
  if (!checkout || checkout.client_id !== user.id) return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
  if (checkout.status !== "created") return NextResponse.json({ error: "This checkout is no longer payable." }, { status: 400 });
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) return NextResponse.json({ error: "Payment system is not configured." }, { status: 500 });
  return NextResponse.json({ keyId });
}