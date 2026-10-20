import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarketplaceHeader from "@/components/MarketplaceHeader";
import DeleteCompletedProjectButton from "@/components/DeleteCompletedProjectButton";

export default async function ProjectsPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = (await searchParams) || {};
  const statusFilter = ["pending_payment", "active", "completed", "cancelled"].includes(params.status || "") ? params.status : undefined;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, account_type")
    .eq("id", user.id)
    .maybeSingle();

  const accountType = profile?.account_type === "freelancer" ? "freelancer" : "client";

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, title, description, budget, deadline, status, created_at")
    .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const visibleProjects = statusFilter ? (projects || []).filter((project) => project.status === statusFilter) : (projects || []);

  const statusClass = (status: string) =>
    status === "pending_payment"
      ? "border-amber-100 bg-amber-50 text-amber-700"
      : status === "active"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : status === "completed"
      ? "border-blue-100 bg-blue-50 text-blue-700"
      : status === "cancelled"
      ? "border-red-100 bg-red-50 text-red-700"
      : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <main className="min-h-screen youtent-app-bg text-slate-950">
      <MarketplaceHeader accountType={accountType} />
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-7 lg:px-8">
        <div className="soft-grid relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white/75 px-6 py-8 shadow-[0_30px_90px_-55px_rgba(15,23,42,.35)] sm:px-9">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70 blur-3xl" />
          <p className="relative text-xs font-black uppercase tracking-[.2em] text-blue-600">Workspace</p>
          <h1 className="relative mt-2 text-3xl font-black tracking-tight sm:text-4xl">My Projects</h1>
          <p className="relative mt-2 max-w-2xl text-sm leading-6 text-slate-500">Everything you are working on with creators, in one clean workspace.</p>
        </div>

        {statusFilter && <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold"><Link href="/projects" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-500">All</Link>{["pending_payment","active","completed"].map((s) => <Link key={s} href={`/projects?status=${s}`} className={`rounded-full border px-3 py-1.5 ${statusFilter === s ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500"}`}>{s === "pending_payment" ? "Pending" : s[0].toUpperCase()+s.slice(1)}</Link>)}</div>}

        {error ? (
          <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">Unable to load projects right now. Please refresh and try again.</div>
        ) : visibleProjects.length ? (
          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            {visibleProjects.map((project) => (
              <article key={project.id} className="premium-card p-5 transition duration-300 hover:-translate-y-1 hover:shadow-2xl sm:p-6">
                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Project</p>
                    <h2 className="mt-1 truncate text-xl font-black">{project.title}</h2>
                  </div>
                  <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black ${statusClass(project.status)}`}>{project.status === "pending_payment" ? "Awaiting Payment" : project.status}</span>
                </div>
                <p className="relative mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{project.description || "No description added."}</p>
                <div className="relative mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50/90 p-3.5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Budget</p><p className="mt-1 font-black">₹{Number(project.budget || 0).toLocaleString("en-IN")}</p></div>
                  <div className="rounded-2xl bg-slate-50/90 p-3.5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deadline</p><p className="mt-1 font-black">{project.deadline ? new Date(project.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not set"}</p></div>
                </div>
                <div className="relative mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Link href={`/projects/${project.id}`} className="flex h-11 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-600">Open Project <span className="ml-2">→</span></Link>
                  {project.status === "completed" && <DeleteCompletedProjectButton projectId={project.id} />}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="premium-card mt-7 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 text-2xl shadow-inner">✦</div>
            <h2 className="mt-4 text-2xl font-black">No projects yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{accountType === "freelancer" ? "Accepted client requests will appear here." : "Find a creator and start your first project."}</p>
            {accountType === "client" && <Link href="/creators" className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20">Browse Creators →</Link>}
          </div>
        )}
      </section>
    </main>
  );
}
