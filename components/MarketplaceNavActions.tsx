"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  created_at: string;
  read_at: string | null;
};

type Props = { accountType: "client" | "freelancer" };

function formatTime(value: string) {
  const date = new Date(value);
  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const authClient = createClient();

export default function MarketplaceNavActions({ accountType }: Props) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [seenAt, setSeenAt] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    let active = true;
    authClient.auth.getUser().then(({ data }) => {
      if (active) setAuthenticated(Boolean(data.user));
    }).catch(() => undefined);
    try {
      setSeenAt({
        all: localStorage.getItem("youtent_seen_notifications_at") || "",
        request: localStorage.getItem("youtent_seen_requests_at") || "",
        message: localStorage.getItem("youtent_seen_messages_at") || "",
      });
    } catch {}
    return () => { active = false; };
  }, []);

  async function loadNotifications() {
    try {
      const response = await fetch("/api/notifications?limit=30", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      // Non-blocking UI.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authenticated) {
      setItems([]);
      setLoading(false);
      return;
    }
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 10000);
    return () => window.clearInterval(interval);
  }, [authenticated]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Badge state is tracked per section. Server read_at is intentionally not used
  // for these counters because reading the notification center must not silently
  // clear the separate Messages or Requests badges.
  const isLocallyUnseen = (item: NotificationItem, bucket: string) => {
    const cutoff = seenAt[bucket];
    return !cutoff || new Date(item.created_at).getTime() > new Date(cutoff).getTime();
  };

  const unread = useMemo(() => items.filter((item) => isLocallyUnseen(item, "all")), [items, seenAt]);
  const requestUnread = useMemo(() => items.filter((item) =>
    (accountType === "freelancer" ? item.type === "project_request" : item.type === "request_status") && isLocallyUnseen(item, "request")
  ).length, [items, seenAt, accountType]);
  const messageUnread = useMemo(() => items.filter((item) => item.type === "message" && isLocallyUnseen(item, "message")).length, [items, seenAt]);

  async function markRead(id: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => undefined);
  }

  async function markAllRead(type?: string) {
    const now = new Date().toISOString();
    const bucket = type === "request" ? "request" : type === "message" ? "message" : "all";
    setSeenAt((current) => ({ ...current, [bucket]: now }));
    try { localStorage.setItem(`youtent_seen_${bucket === "all" ? "notifications" : bucket + "s"}_at`, now); } catch {}

    setItems((current) => current.map((item) =>
      (!type || item.type === type || (type === "request" && (item.type === "project_request" || item.type === "request_status")))
        ? { ...item, read_at: item.read_at || now }
        : item
    ));

    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(type ? { type } : { all: true }),
    }).catch(() => undefined);
  }

  function openNotifications() {
    setOpen((value) => {
      const next = !value;
      if (next && unread.length) {
        const now = new Date().toISOString();
        setSeenAt((current) => ({ ...current, all: now }));
        try { localStorage.setItem("youtent_seen_notifications_at", now); } catch {}
      }
      return next;
    });
  }

  const requestsHref = accountType === "freelancer" ? "/requests" : "/my-requests";

  return (
    <>
      <Link href="/creators" className="hidden rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 lg:inline-flex">
        Browse Creators
      </Link>

      {!authenticated ? (
        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/login" className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100">Log in</Link>
          <Link href="/signup" className="rounded-xl bg-slate-950 px-3.5 py-2.5 text-sm font-black text-white hover:bg-blue-600">Sign up</Link>
        </div>
      ) : (
        <>
          <Link href="/dashboard/messages" onClick={() => { if (messageUnread) void markAllRead("message"); }} aria-label={`Messages${messageUnread ? `, ${messageUnread} unread` : ""}`} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-base text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
            ✉
            {messageUnread > 0 && <Badge count={messageUnread} />}
          </Link>

          <div className="relative">
            <button type="button" aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ""}`} onClick={openNotifications} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-base text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
              🔔
              {unread.length > 0 && <Badge count={unread.length} />}
            </button>

            {open && (
              <div className="absolute right-0 top-12 z-[120] w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-24px_rgba(15,23,42,.35)]">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div><p className="text-sm font-black text-slate-950">Notifications</p><p className="text-xs text-slate-500">{unread.length ? `${unread.length} unread` : "You're all caught up"}</p></div>
                  {unread.length > 0 && <button type="button" onClick={() => void markAllRead()} className="text-xs font-bold text-blue-600">Mark all read</button>}
                </div>
                <div className="max-h-[420px] overflow-y-auto">
                  {loading ? <div className="px-4 py-8 text-center text-sm text-slate-500">Loading notifications...</div> : items.length === 0 ? (
                    <div className="px-4 py-10 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-lg">🔔</div><p className="mt-3 text-sm font-bold text-slate-800">No notifications yet</p><p className="mt-1 text-xs text-slate-500">New requests, messages and updates will appear here.</p></div>
                  ) : items.map((item) => (
                    <Link key={item.id} href={item.link || "/notifications"} onClick={() => { if (!item.read_at) markRead(item.id); setOpen(false); }} className={`block border-b border-slate-100 px-4 py-3.5 transition hover:bg-slate-50 ${!item.read_at ? "bg-blue-50/55" : "bg-white"}`}>
                      <div className="flex gap-3"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${!item.read_at ? "bg-red-500" : "bg-slate-300"}`} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold text-slate-900">{item.title}</p><span className="shrink-0 text-[10px] font-semibold text-slate-400">{formatTime(item.created_at)}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{item.message}</p></div></div>
                    </Link>
                  ))}
                </div>
                <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-xs font-black text-blue-600 hover:bg-slate-50">View all notifications →</Link>
              </div>
            )}
          </div>

          <Link href="/profile" className="hidden rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:inline-flex">My Profile</Link>

          <form action="/auth/signout" method="post" className="hidden sm:block">
            <button className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">Log out</button>
          </form>
        </>
      )}

      {!authenticated ? (
        <div className="flex items-center gap-1.5 sm:hidden">
          <Link href="/login" className="rounded-lg px-2.5 py-2 text-xs font-bold text-slate-700">Log in</Link>
          <Link href="/signup" className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">Sign up</Link>
        </div>
      ) : (
        <button type="button" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-slate-700 shadow-sm sm:hidden">☰</button>
      )}

      {mounted && menuOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="YOUTENT quick access"
          className="sm:hidden"
          style={{
            position: "fixed", inset: 0, width: "100vw", height: "100dvh", minHeight: "100vh",
            zIndex: 2147483647, display: "flex", justifyContent: "flex-end", alignItems: "stretch",
            background: "rgba(3, 7, 18, .58)", backdropFilter: "blur(3px)", isolation: "isolate",
          }}
        >
          <button aria-label="Close menu" onClick={() => setMenuOpen(false)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "transparent", cursor: "default" }} />
          <aside
            style={{
              position: "relative", zIndex: 1, width: "min(92vw, 390px)", height: "100dvh", minHeight: "100vh", maxHeight: "100dvh",
              display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff",
              boxShadow: "-24px 0 70px -25px rgba(15,23,42,.7)",
            }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
              <div><p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">YOUTENT</p><p className="mt-0.5 text-lg font-black text-slate-950">Quick Access</p></div>
              <button type="button" onClick={() => setMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg font-black text-slate-700">×</button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 overscroll-contain">
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-blue-600">Workspace</p>
                <p className="mt-1 text-sm font-bold text-slate-900">Everything important, one tap away.</p>
              </div>

              <div className="mt-4 space-y-1.5">
                <MobileLink href="/dashboard" label="Dashboard" icon="⌂" onClick={() => setMenuOpen(false)} />
                <MobileLink href="/creators" label="Browse Creators" icon="✦" onClick={() => setMenuOpen(false)} />
                <MobileLink href="/projects" label="My Projects" icon="▣" onClick={() => setMenuOpen(false)} />
                <MobileLink href="/projects?status=pending_payment" label="Pending Projects" icon="⏳" onClick={() => setMenuOpen(false)} />
                <MobileLink href="/projects?status=active" label="Active Projects" icon="⚡" onClick={() => setMenuOpen(false)} />
                <MobileLink href="/projects?status=completed" label="Completed Projects" icon="✓" onClick={() => setMenuOpen(false)} />
                <MobileLink href="/dashboard/messages" label="Messages" icon="✉" badge={messageUnread} onClick={() => { if (messageUnread) void markAllRead("message"); setMenuOpen(false); }} />
                <MobileLink href="/notifications" label="Notifications" icon="🔔" badge={unread.length} onClick={() => { if (unread.length) void markAllRead(); setMenuOpen(false); }} />
                <MobileLink href="/profile" label="My Profile" icon="◉" onClick={() => setMenuOpen(false)} />
                <MobileLink href="/wallet" label="Wallet" icon="₹" onClick={() => setMenuOpen(false)} />
                <MobileLink href="/faq" label="FAQ & Help" icon="?" onClick={() => setMenuOpen(false)} />
                <MobileLink href="/contact" label="Contact Support" icon="✆" onClick={() => setMenuOpen(false)} />\n                <form action="/auth/signout" method="post" className="pt-1">\n                  <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-sm">↪</span><span className="flex-1">Log out</span><span className="text-red-200">→</span></button>\n                </form>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <form action="/auth/signout" method="post"><button className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-700 shadow-sm">Log out</button></form>
            </div>
          </aside>
        </div>,
        document.body
      )}
    </>
  );
}

function MobileLink({ href, label, icon, badge, onClick }: { href: string; label: string; icon: string; badge?: number; onClick: () => void }) {
  return <Link href={href} onClick={onClick} className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm">{icon}</span><span className="min-w-0 flex-1">{label}</span>{badge ? <Badge count={badge} inline /> : <span className="text-slate-300">→</span>}</Link>;
}

function Badge({ count, inline = false }: { count: number; inline?: boolean }) {
  return <span className={inline ? "flex min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white" : "absolute -right-0.5 -top-1 flex min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-black leading-[14px] text-white shadow-sm"}>{count > 99 ? "99+" : count}</span>;
}
