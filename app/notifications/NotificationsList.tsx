"use client";

import Link from "next/link";
import { useState } from "react";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  created_at: string;
  read_at: string | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationsList({ initialNotifications }: { initialNotifications: NotificationItem[] }) {
  const [items, setItems] = useState(initialNotifications);

  async function mark(id: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => undefined);
  }

  async function markAll() {
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => undefined);
  }

  const unread = items.filter((item) => !item.read_at).length;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_25px_70px_-45px_rgba(15,23,42,.35)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm font-bold text-slate-600">{unread ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "All notifications are read"}</p>
        {unread > 0 && <button onClick={markAll} className="text-left text-xs font-black text-blue-600 hover:text-blue-700 sm:text-right">Mark all as read</button>}
      </div>

      {items.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl">♢</div>
          <h2 className="mt-4 text-lg font-black">No notifications yet</h2>
          <p className="mt-1 text-sm text-slate-500">New activity will appear here automatically.</p>
        </div>
      ) : (
        items.map((item) => {
          const content = (
            <div className={`flex gap-4 px-5 py-5 transition hover:bg-slate-50 sm:px-6 ${!item.read_at ? "bg-blue-50/45" : ""}`}>
              <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${!item.read_at ? "bg-red-500" : "bg-slate-300"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <h2 className="font-black text-slate-900">{item.title}</h2>
                  <time className="text-[11px] font-semibold text-slate-400">{formatDate(item.created_at)}</time>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.message}</p>
              </div>
            </div>
          );

          if (!item.link) return <div key={item.id} className="border-b border-slate-100">{content}</div>;

          return (
            <Link key={item.id} href={item.link} onClick={() => !item.read_at && mark(item.id)} className="block border-b border-slate-100">
              {content}
            </Link>
          );
        })
      )}
    </div>
  );
}
