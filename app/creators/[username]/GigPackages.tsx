"use client";

import { useEffect, useMemo, useState } from "react";
import HireForm from "./HireForm";
import type { ServicePackage, GigMedia } from "@/lib/gigs";

export default function GigPackages({
  creatorId,
  creatorName,
  gigId,
  gigTitle,
  category,
  subcategory,
  tags = [],
  packages,
  startingPrice,
  media = [],
}: {
  creatorId: string;
  creatorName: string;
  gigId: string;
  gigTitle?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  packages: ServicePackage[];
  media?: GigMedia[];
  startingPrice: number;
}) {
  const safePackages = useMemo(
    () => packages.length ? packages : [{ id: "custom", name: "Custom", description: "Discuss your exact scope with this creator.", price: startingPrice, deliveryDays: 7, revisions: 1, media: [] }],
    [packages, startingPrice]
  );
  const [activeId, setActiveId] = useState(safePackages[0]?.id);
  const active = safePackages.find((item) => item.id === activeId) || safePackages[0];
  const activeMediaList = active?.media?.length ? active.media : (active?.id === safePackages[0]?.id ? media : []);
  const [activeMediaId, setActiveMediaId] = useState(activeMediaList[0]?.id || "");
  useEffect(() => { setActiveMediaId(activeMediaList[0]?.id || ""); }, [active?.id]);
  const activeMedia = activeMediaList.find((item) => item.id === activeMediaId) || activeMediaList[0];

  return (
    <div id={`gig-${gigId}`} className="scroll-mt-24 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_24px_70px_-38px_rgba(15,23,42,.35)]">
      <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50/80">
        {safePackages.slice(0, 3).map((item) => (
          <button key={item.id} type="button" onClick={() => setActiveId(item.id)} className={`relative px-3 py-4 text-sm font-black transition ${active.id === item.id ? "bg-white text-slate-950" : "text-slate-500 hover:text-slate-900"}`}>
            {item.name}
            {active.id === item.id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-violet-100/50 blur-3xl" />
        <div className="relative">
          {activeMediaList.length > 0 && (
            <div className="mb-6">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
                {activeMedia?.mediaType === "video" ? (
                  <video key={activeMedia.url} src={activeMedia.url} controls playsInline preload="metadata" className="max-h-[520px] min-h-[220px] w-full object-contain" />
                ) : (
                  <img key={activeMedia?.url} src={activeMedia?.url} alt={activeMedia?.title || gigTitle || "Gig media"} className="max-h-[520px] min-h-[220px] w-full object-contain" />
                )}
              </div>
              {activeMediaList.length > 1 && (
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {activeMediaList.slice(0, 6).map((item) => (
                    <button key={item.id} type="button" onClick={() => setActiveMediaId(item.id)} className={`overflow-hidden rounded-xl border-2 bg-slate-100 ${activeMedia?.id === item.id ? "border-blue-600" : "border-transparent"}`} aria-label={`View ${item.title || "gig media"}`}>
                      {item.mediaType === "video" ? <video src={item.url} muted playsInline preload="metadata" className="aspect-video w-full object-cover" /> : <img src={item.url} alt="" className="aspect-video w-full object-cover" />}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs font-semibold text-slate-400">{activeMediaList.length} {activeMediaList.length === 1 ? "media item" : "media items"} for {active.name}</p>
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-slate-400">{gigTitle || "Gig"} • {active.name}</p>
              {(category || subcategory) && <p className="mt-2 text-xs font-bold text-blue-600">{category}{subcategory ? ` · ${subcategory}` : ""}</p>}
              {tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{tags.slice(0, 10).map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">#{tag}</span>)}</div>
              <p className="mt-2 text-3xl font-black tracking-tight">₹{Number(active.price).toLocaleString("en-IN")}</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700">Secure checkout</span>
          </div>

          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{active.description}</p>
          {active.scope && <p className="mt-3 text-sm leading-6 text-slate-700"><strong>Scope:</strong> {active.scope}</p>}
          {active.includes && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700"><strong>Includes:</strong> {active.includes}</p>}

          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3"><span>Delivery</span><strong>{active.deliveryDays} days</strong></div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3"><span>Revisions</span><strong>{active.revisions}</strong></div>
            <div className="flex items-center justify-between"><span>Communication</span><strong>Direct</strong></div>
          </div>

          <div className="mt-6">
            <HireForm creatorId={creatorId} creatorName={creatorName} gigId={gigId} gigTitle={gigTitle} packages={[active]} />
          </div>
        </div>
      </div>
    </div>
  );
}
