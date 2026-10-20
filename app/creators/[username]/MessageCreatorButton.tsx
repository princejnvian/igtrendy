"use client";

import { useState } from "react";

export default function MessageCreatorButton({ creatorId }: { creatorId: string }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("");

    try {
      const r = await fetch("/api/creator-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, content }),
      });

      const d = await r.json();

      if (!r.ok) {
        setStatus(d.error || "Unable to send message.");
        return;
      }

      setContent("");
      setStatus("Message sent.");
    } catch {
      setStatus("Unable to send message right now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStatus("");
          setOpen(true);
        }}
        className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-600"
      >
        Message Creator
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/70 bg-white p-5 shadow-[0_30px_80px_-25px_rgba(15,23,42,.38)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-blue-600">
                  Direct message
                </p>
                <h2 className="mt-1 text-2xl font-black">Start a conversation</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full px-2 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={send} className="mt-5">
              <textarea
                autoFocus
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tell the creator what you need..."
                className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue-500 focus:bg-white"
                required
              />

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-slate-400">
                  Keep project details clear and specific.
                </span>
                <button
                  disabled={saving}
                  className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? "Sending..." : "Send Message"}
                </button>
              </div>

              {status && (
                <p
                  className={`mt-3 text-sm font-medium ${
                    status === "Message sent."
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {status}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
