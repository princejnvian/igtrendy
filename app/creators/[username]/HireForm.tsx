"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ServicePackage } from "@/lib/gigs";



type HireFormProps = {
  creatorId: string;
  creatorName: string;
  gigId: string;
  gigTitle?: string;
  packages: ServicePackage[];
};

export default function HireForm({ creatorId, creatorName, gigId, gigTitle, packages }: HireFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(packages[0]?.id || "");

  const selectedPackage = packages.find((item) => item.id === selectedId) || packages[0];

  function openOrder() {
    setError("");
    setSelectedId(packages[0]?.id || "");
    setOpen(true);
  }

  async function startOrder() {
    setError("");
    if (!selectedPackage) {
      setError("This freelancer has not published any orderable gig package yet.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname || "/creators")}`);
      return;
    }
    if (user.id === creatorId) {
      setError("You cannot order your own gig.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/checkout-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freelancerId: creatorId, gigId, packageId: selectedPackage.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to start checkout.");
      router.push(`/checkout/${result.checkoutId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout.");
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openOrder}
        disabled={!packages.length}
        className="w-full rounded-xl bg-blue-600 px-7 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
      >
        {packages.length ? "Order Now" : "No Gig Available"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="my-6 w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-blue-100">Choose a package</p>
                  <h2 className="mt-2 text-2xl font-black">{gigTitle || "What do you want to order?"}</h2>
                  <p className="mt-1 text-sm text-blue-100">{creatorName} has fixed the price, scope and delivery for each package.</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl bg-white/10 px-3 py-2 text-xl text-white hover:bg-white/20">×</button>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="grid gap-3 md:grid-cols-3">
                {packages.map((item) => {
                  const active = item.id === selectedPackage?.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setSelectedId(item.id); setError(""); }}
                      className={`text-left rounded-2xl border-2 p-4 transition ${active ? "border-blue-600 bg-blue-50 shadow-md" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-blue-700">{item.name}</span>
                        {active && <span className="rounded-full bg-blue-600 px-2 py-1 text-[10px] font-black text-white">SELECTED</span>}
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-950">₹{Number(item.price).toLocaleString("en-IN")}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{item.deliveryDays} day delivery • {item.revisions} revisions</p>
                    </button>
                  );
                })}
              </div>

              {selectedPackage && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Selected gig</p>
                      <h3 className="mt-1 text-xl font-black text-slate-950">{selectedPackage.name}</h3>
                    </div>
                    <p className="text-2xl font-black text-slate-950">₹{Number(selectedPackage.price).toLocaleString("en-IN")}</p>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selectedPackage.description || "Freelancer service package."}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Detail label="Scope / quantity" value={selectedPackage.scope || "As described by the freelancer."} />
                    <Detail label="What's included" value={selectedPackage.includes || "See package description."} />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Info label="Gig price" value={`₹${Number(selectedPackage.price).toLocaleString("en-IN")}`} />
                    <Info label="Delivery" value={`${selectedPackage.deliveryDays} days`} />
                    <Info label="Revisions" value={String(selectedPackage.revisions)} />
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-800">
                You cannot change the package price, deadline, scope or revisions. Choose the package that matches what you need and continue to payment.
              </div>
              {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
              <button
                type="button"
                onClick={startOrder}
                disabled={saving || !selectedPackage}
                className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-600 disabled:opacity-60"
              >
                {saving ? "Preparing checkout..." : `Continue with ${selectedPackage?.name || "Package"} →`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-lg font-black text-slate-950">{value}</p></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">{value}</p></div>;
}
