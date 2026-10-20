"use client";

import { useEffect, useState } from "react";

type PortfolioItem = {
  id: string;
  title: string;
  description?: string;
  url: string;
  mediaType: "image" | "video" | "audio";
  category?: string;
};

export default function PortfolioLightbox({ items }: { items: PortfolioItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const active = activeIndex === null ? null : items[activeIndex];

  useEffect(() => {
    if (activeIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") {
        setActiveIndex((current) =>
          current === null ? null : (current + 1) % items.length,
        );
      }
      if (event.key === "ArrowLeft") {
        setActiveIndex((current) =>
          current === null ? null : (current - 1 + items.length) % items.length,
        );
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [activeIndex, items.length]);

  if (!items.length) return null;

  return (
    <>
      <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
        {items.map((item, index) => (
          <article
            key={item.id}
            className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_-24px_rgba(15,23,42,.35)] transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <button
              type="button"
              onClick={() => setActiveIndex(index)}
              className="group relative block w-full cursor-zoom-in text-left"
              aria-label={`Open ${item.title || "portfolio item"}`}
            >
              <div className="aspect-[16/10] overflow-hidden bg-slate-100">
                {item.mediaType === "image" ? (
                  <img
                    src={item.url}
                    alt={item.title || "Portfolio work"}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
                  />
                ) : item.mediaType === "video" ? (
                  <video
                    src={item.url}
                    preload="metadata"
                    className="h-full w-full object-cover"
                    aria-label={item.title || "Portfolio video"}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-slate-50 p-5">
                    <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm">
                      Open audio preview
                    </span>
                  </div>
                )}
              </div>

              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-950/75 via-slate-950/25 to-transparent px-4 pb-3 pt-10 text-white opacity-0 transition duration-200 group-hover:opacity-100">
                <span className="text-xs font-bold">Open full preview</span>
                <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] font-bold backdrop-blur-sm">
                  ↗
                </span>
              </span>
            </button>

            <div className="p-4">
              <h3 className="truncate font-black text-slate-950">{item.title}</h3>
              {item.description && (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                  {item.description}
                </p>
              )}
              <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-blue-600">
                {item.category || "Creative Work"}
              </p>
            </div>
          </article>
        ))}
      </div>

      {active && activeIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={active.title || "Portfolio preview"}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveIndex(null);
          }}
        >
          <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">
                  {active.title || "Portfolio preview"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {activeIndex + 1} of {items.length}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveIndex(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl leading-none text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close portfolio preview"
              >
                ×
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-slate-950 p-3 sm:p-6">
              {active.mediaType === "image" ? (
                <img
                  src={active.url}
                  alt={active.title || "Portfolio work"}
                  className="max-h-[76vh] max-w-full object-contain"
                />
              ) : active.mediaType === "video" ? (
                <video
                  src={active.url}
                  controls
                  autoPlay
                  className="max-h-[76vh] max-w-full rounded-xl"
                />
              ) : (
                <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6">
                  <p className="mb-4 text-sm font-bold text-white">Audio preview</p>
                  <audio src={active.url} controls className="w-full" autoPlay />
                </div>
              )}

              {items.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((current) =>
                        current === null ? null : (current - 1 + items.length) % items.length,
                      )
                    }
                    className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-xl text-white shadow-lg backdrop-blur transition hover:bg-white hover:text-slate-950 sm:left-5"
                    aria-label="Previous portfolio item"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((current) =>
                        current === null ? null : (current + 1) % items.length,
                      )
                    }
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-xl text-white shadow-lg backdrop-blur transition hover:bg-white hover:text-slate-950 sm:right-5"
                    aria-label="Next portfolio item"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {(active.description || active.category) && (
              <div className="border-t border-white/10 bg-slate-900 px-4 py-3 sm:px-5">
                {active.description && (
                  <p className="text-xs leading-5 text-slate-300">{active.description}</p>
                )}
                {active.category && (
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-blue-400">
                    {active.category}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
