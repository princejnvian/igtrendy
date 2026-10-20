import YoutentLogo from "@/components/YoutentLogo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationsList from "./NotificationsList";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, message, link, created_at, read_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen youtent-app-bg text-slate-900">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/dashboard" className="text-xl font-black tracking-tight">
            YOUTENT<span className="text-blue-600">.</span>
          </Link>
          <Link href="/dashboard" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-blue-200 hover:text-blue-600">
            Dashboard
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-12">
        <div className="mb-7">
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Activity</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Notifications</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Requests, messages and project updates in one place.</p>
        </div>
        <NotificationsList initialNotifications={notifications || []} />
      </section>
    </main>
  );
}
