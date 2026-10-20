import YoutentLogo from "@/components/YoutentLogo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  account_type: "client" | "freelancer" | null;
};

type ActiveProject = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  client_id: string;
  freelancer_id: string | null;
};

export default async function MessagesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("type", "message")
    .is("read_at", null);

  // The Messages dashboard should show every project that is currently active.
  // Each row opens that project's real conversation, where only its two members
  // can read/send messages.
  const { data: activeProjects } = await supabase
    .from("projects")
    .select("id, title, status, created_at, client_id, freelancer_id")
    .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const projects = (activeProjects || []) as ActiveProject[];

  const otherUserIds = Array.from(
    new Set(
      projects
        .map((project) =>
          project.client_id === user.id ? project.freelancer_id : project.client_id
        )
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: profiles } = otherUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, account_type")
        .in("id", otherUserIds)
    : { data: [] as Profile[] };

  const profileMap = new Map(
    ((profiles || []) as Profile[]).map((profile) => [profile.id, profile])
  );

  return (
    <main className="min-h-screen youtent-app-bg text-slate-900">
      {/* Navbar */}
      <nav className="border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
          <YoutentLogo href="/dashboard" />

          <Link
            href="/dashboard"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            ← Dashboard
          </Link>
        </div>
      </nav>

      {/* Main */}
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-12">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">
            Messages
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Your Messages
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Open a conversation with the client or creator from any active project.
          </p>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-black text-slate-950">Active Project Conversations</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {projects.length > 0
                    ? `${projects.length} active ${projects.length === 1 ? "project" : "projects"}`
                    : "No active projects yet"}
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl">
                💬
              </div>
            </div>
          </div>

          {projects.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {projects.map((project) => {
                const otherUserId =
                  project.client_id === user.id
                    ? project.freelancer_id
                    : project.client_id;
                const person = otherUserId ? profileMap.get(otherUserId) : undefined;

                const personName =
                  person?.full_name ||
                  (person?.username ? `@${person.username}` : null) ||
                  (project.client_id === user.id ? "Creator" : "Client");

                const role = project.client_id === user.id ? "Creator" : "Client";
                const initials = personName.replace(/^@/, "").charAt(0).toUpperCase() || "U";

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}/messages`}
                    className="group flex items-center gap-4 px-5 py-4 transition hover:bg-blue-50/60 sm:px-6"
                  >
                    {person?.avatar_url ? (
                      <img
                        src={person.avatar_url}
                        alt={personName}
                        className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-base font-black text-white shadow-sm">
                        {initials}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-black text-slate-950 group-hover:text-blue-700">
                          {personName}
                        </h3>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                          Active
                        </span>
                      </div>

                      <p className="mt-0.5 text-xs font-semibold text-slate-500">
                        {role} · {project.title}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Tap to open project conversation
                      </p>
                    </div>

                    <span className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition group-hover:bg-blue-600">
                      Message →
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center p-8 text-center">
              <div className="max-w-md">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                  💬
                </div>

                <h3 className="mt-5 text-xl font-black text-slate-950">
                  No active conversations
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  When you have an active project with a client or creator, it will
                  appear here and you can open the conversation directly.
                </p>

                <Link
                  href="/dashboard"
                  className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-600"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
