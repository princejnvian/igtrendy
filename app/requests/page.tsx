import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RequestActions from "./RequestActions";
import MarketplaceHeader from "@/components/MarketplaceHeader";

type Props = { searchParams?: Promise<{ status?: string; request?: string }> };

export default async function RequestsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("type", "project_request")
    .is("read_at", null);

  const params = (await searchParams) || {};
  const statusFilter = ["pending", "accepted", "completed"].includes(params.status || "") ? params.status : undefined;

  const { data: requests, error } = await supabase
    .from("project_requests")
    .select("id, project_title, description, service, budget, deadline, status, created_at, client_id")
    .eq("creator_id", user.id)
    .neq("status", "declined")
    .order("created_at", { ascending: false });

  const filteredRequests = statusFilter ? (requests || []).filter((r) => r.status === statusFilter) : (requests || []);
  const clientIds = [...new Set((requests || []).map((r) => r.client_id))];
  let clients: Record<string, { full_name: string | null; username: string | null; avatar_url: string | null }> = {};
  if (clientIds.length) {
    const { data } = await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", clientIds);
    clients = Object.fromEntries((data || []).map((c) => [c.id, c]));
  }

  const requestIds = (requests || []).map((r) => r.id);
  let projects: Record<string, string> = {};
  if (requestIds.length) {
    const { data } = await supabase.from("projects").select("id, request_id").in("request_id", requestIds);
    projects = Object.fromEntries((data || []).map((p) => [p.request_id, p.id]));
  }

  const totalRequests = requests?.length || 0;
  const pendingRequests = (requests || []).filter((r) => r.status === "pending").length;
  const activeRequests = (requests || []).filter((r) => r.status === "accepted").length;
  const completedRequests = (requests || []).filter((r) => r.status === "completed").length;

  return (
    <main className="min-h-screen youtent-app-bg text-slate-900">
      <MarketplaceHeader accountType="freelancer" />

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="rounded-[24px] border border-slate-200/80 bg-white/85 px-5 py-6 shadow-sm backdrop-blur-xl sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-blue-700"><span className="h-1.5 w-1.5 rounded-full bg-blue-600" />Creator Workspace</span>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Project Requests</h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">Review incoming work, accept the right projects and keep your workspace organized.</p>
            </div>
            <Link href="/creators" className="inline-flex w-fit rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-600">Browse creators →</Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat href="/requests" label="Total" value={totalRequests} icon="📥" />
          <Stat href="/requests?status=pending" label="Pending" value={pendingRequests} icon="⏳" tone="amber" />
          <Stat href="/requests?status=accepted" label="Active" value={activeRequests} icon="⚡" tone="blue" />
          <Stat href="/requests?status=completed" label="Completed" value={completedRequests} icon="✓" tone="emerald" />
        </div>

        {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">Unable to load requests right now. Please refresh and try again.</div>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-black">{statusFilter ? `${statusFilter[0].toUpperCase()}${statusFilter.slice(1)} requests` : "Incoming requests"}</h2><p className="mt-0.5 text-xs text-slate-500">{filteredRequests.length} request{filteredRequests.length === 1 ? "" : "s"} shown</p></div>
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-bold">
            <Filter href="/requests" active={!statusFilter}>All</Filter>
            <Filter href="/requests?status=pending" active={statusFilter === "pending"}>Pending</Filter>
            <Filter href="/requests?status=accepted" active={statusFilter === "accepted"}>Active</Filter>
            <Filter href="/requests?status=completed" active={statusFilter === "completed"}>Completed</Filter>
          </div>
        </div>

        {!filteredRequests.length ? (
          <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-12 text-center shadow-sm"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">📬</div><h2 className="mt-4 text-xl font-black">No requests here</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">New client requests will appear here automatically.</p></div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredRequests.map((request) => {
              const client = clients[request.client_id];
              const clientName = client?.full_name || "Client";
              const initial = clientName.charAt(0).toUpperCase();
              const projectId = projects[request.id];
              const isSelected = params.request === request.id;
              const status = request.status === "pending" ? { label: "Pending Review", cls: "border-amber-200 bg-amber-50 text-amber-700" } : request.status === "accepted" ? { label: "Accepted", cls: "border-blue-200 bg-blue-50 text-blue-700" } : { label: "Completed", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" };
              return (
                <article id={`request-${request.id}`} key={request.id} className={`rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isSelected ? "border-blue-400 ring-4 ring-blue-100" : "border-slate-200"}`}>
                  <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[230px_minmax(0,1fr)_260px] lg:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      {client?.avatar_url ? <img src={client.avatar_url} alt={clientName} className="h-11 w-11 shrink-0 rounded-xl object-cover" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-black text-white">{initial}</div>}
                      <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.15em] text-slate-400">Request from</p><Link href={`/creators/${client?.username || request.client_id}`} className="block truncate text-sm font-black text-slate-900 hover:text-blue-600">{clientName}</Link>{client?.username && <p className="truncate text-xs text-slate-500">@{client.username}</p>}</div>
                    </div>

                    <div className="min-w-0 border-t border-slate-100 pt-3 sm:pt-0 lg:border-l lg:border-t-0 lg:pl-5">
                      <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase tracking-[.16em] text-blue-600">New Project</span>{request.service && <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700">✦ {request.service}</span>}</div>
                      <h3 className="mt-1 truncate text-lg font-black text-slate-950">{request.project_title}</h3>
                      <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-500">{request.description || "No project description provided."}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-bold text-slate-500"><span>₹{Number(request.budget || 0).toLocaleString("en-IN")}</span><span>•</span><span>{request.deadline ? new Date(request.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "No deadline"}</span><span>•</span><span>{new Date(request.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div>
                    </div>

                    <div className="flex flex-col gap-2 lg:items-end">
                      <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${status.cls}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status.label}</span>
                      {request.status === "pending" ? <RequestActions requestId={request.id} /> : projectId ? <Link href={`/projects/${projectId}`} className="inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white hover:bg-blue-600">Open Project →</Link> : <span className="text-xs text-slate-400">Workspace preparing</span>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ href, label, value, icon, tone = "slate" }: { href: string; label: string; value: number; icon: string; tone?: string }) {
  const tones: Record<string, string> = { slate: "bg-slate-100", amber: "bg-amber-50", blue: "bg-blue-50", emerald: "bg-emerald-50" };
  return <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone] || tones.slate} text-lg`}>{icon}</div></div></Link>;
}

function Filter({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} className={`shrink-0 rounded-full border px-3 py-1.5 ${active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500 hover:text-slate-900"}`}>{children}</Link>;
}
