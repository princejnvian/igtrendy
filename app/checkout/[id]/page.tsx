import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import YoutentLogo from "@/components/YoutentLogo";
import CheckoutPaymentButton from "./CheckoutPaymentButton";
import { platformFeeRate } from "@/lib/platform-fee";

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { data: checkout } = await supabaseAdmin
    .from("checkout_orders")
    .select("id, client_id, freelancer_id, gig_title, package_name, package_description, package_price, delivery_days, revisions, platform_fee, razorpay_order_id, project_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!checkout || checkout.client_id !== user.id) notFound();
  if (checkout.status === "paid" && checkout.project_id) redirect(`/projects/${checkout.project_id}`);

  const price = Number(checkout.package_price);
  const fee = Number(checkout.platform_fee);
  const total = price + fee;

  return (
    <main className="min-h-screen youtent-app-bg text-slate-950">
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <YoutentLogo href="/creators" />
          <Link href="/creators" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600">← Back to creators</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
        <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Order checkout</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Review your gig before payment.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Price, delivery time and revisions come directly from the freelancer's selected gig package.</p>

        <div className="mt-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
          <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-7 text-white">
            <p className="text-xs font-black uppercase tracking-widest text-blue-100">Selected gig</p>
            <h2 className="mt-2 text-2xl font-black">{checkout.gig_title || "Freelancer service"}</h2><p className="mt-1 text-sm font-bold text-blue-100">Package: {checkout.package_name}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">{checkout.package_description || "Freelancer service package."}</p>
          </div>
          <div className="p-6 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-3">
              <Summary label="Gig price" value={`₹${price.toLocaleString("en-IN")}`} />
              <Summary label="Delivery" value={`${checkout.delivery_days} days`} />
              <Summary label="Revisions" value={String(checkout.revisions)} />
            </div>

            <div className="mt-7 space-y-3 border-t border-slate-100 pt-6">
              <div className="flex justify-between text-sm text-slate-600"><span>Gig price</span><strong className="text-slate-950">₹{price.toLocaleString("en-IN")}</strong></div>
              <div className="flex justify-between text-sm text-slate-600"><span>YOUTENT platform fee ({platformFeeRate(price)}%)</span><strong className="text-slate-950">₹{fee.toLocaleString("en-IN")}</strong></div>
              <div className="flex justify-between border-t border-slate-100 pt-4 text-lg font-black"><span>Total</span><span>₹{total.toLocaleString("en-IN")}</span></div>
            </div>

            <div className="mt-7 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
              The client cannot edit the gig price, delivery deadline or revision count here. These values are controlled by the freelancer's published package.
            </div>

            <div className="mt-6">
              <CheckoutPaymentButton checkoutId={checkout.id} orderId={checkout.razorpay_order_id} amount={Math.round(total * 100)} packageName={checkout.package_name} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-lg font-black text-slate-950">{value}</p></div>;
}