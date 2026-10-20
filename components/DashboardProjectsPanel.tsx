"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Project = {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  deadline: string | null;
  status: string;
  created_at: string;
  client_id: string;
  freelancer_id: string | null;
};

type Props = {
  accountType: "client" | "freelancer";
  projectCount: number;
  activeProjects: number;
  completedProjects: number;
  projects: Project[];
};

type Filter = "all" | "active" | "completed";
type SortKey = "newest" | "oldest" | "budget-high" | "budget-low" | "deadline" | "title";

const statusMeta: Record<string, { label: string; className: string }> = {
  pending_payment: { label: "Awaiting Payment", className: "bg-amber-50 text-amber-700 border-amber-200" },
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed: { label: "Completed", className: "bg-blue-50 text-blue-700 border-blue-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700 border-red-200" },
};

function scrollToProjects() {
  requestAnimationFrame(() => {
    document.getElementById("my-projects")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

export default function DashboardProjectsPanel({
  accountType,
  projectCount,
  activeProjects,
  completedProjects,
  projects,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [showAll, setShowAll] = useState(false);

  const sortedProjects = useMemo(() => {
    const filtered = projects.filter((project) => {
      if (filter === "active") return project.status === "active";
      if (filter === "completed") return project.status === "completed";
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === "budget-high") return Number(b.budget || 0) - Number(a.budget || 0);
      if (sort === "budget-low") return Number(a.budget || 0) - Number(b.budget || 0);
      if (sort === "deadline") {
        const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      }
      if (sort === "title") return a.title.localeCompare(b.title);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filter, projects, sort]);

  const visibleProjects = filter === "all" && !showAll ? sortedProjects.slice(0, 4) : sortedProjects;

  function activateFilter(next: Filter) {
    setFilter(next);
    setShowAll(next !== "all");
    scrollToProjects();
  }

  return (
    <>
      <section className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon="💼"
          label="Account"
          value={accountType === "freelancer" ? "Freelancer" : "Client"}
          tone="violet"
          onClick={() => { window.location.href = "/profile"; }}
        />
        <MetricCard icon="📁" label="Total Projects" value={String(projectCount)} tone="blue" active={filter === "all"} onClick={() => activateFilter("all")} />
        <MetricCard icon="⚡" label="Active Projects" value={String(activeProjects)} tone="emerald" active={filter === "active"} onClick={() => activateFilter("active")} />
        <MetricCard icon="✓" label="Completed" value={String(completedProjects)} tone="indigo" active={filter === "completed"} onClick={() => activateFilter("completed")} />
      </section>

      <section id="my-projects" className="scroll-mt-28 pt-7">
        <div className="mb-4 flex flex-col gap-4 rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-[0_18px_45px_-32px_rgba(15,23,42,.5)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">My Projects</h2>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                {filter === "all" ? "All" : filter === "active" ? "Active" : "Completed"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              {accountType === "freelancer" ? "Projects you are currently working on with clients." : "Projects you have started with creators."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-slate-100/80 p-1">
              {(["all", "active", "completed"] as Filter[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => activateFilter(item)}
                  className={`rounded-lg px-3 py-2 text-xs font-black capitalize transition ${filter === item ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-white hover:text-slate-900"}`}
                >
                  {item}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm">
              <span>Sort</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className="border-0 bg-transparent p-0 pr-5 text-xs font-black text-slate-800 outline-none focus:ring-0"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="budget-high">Budget: High → Low</option>
                <option value="budget-low">Budget: Low → High</option>
                <option value="deadline">Deadline: Nearest</option>
                <option value="title">Title: A → Z</option>
              </select>
            </label>
          </div>
        </div>

        {visibleProjects.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleProjects.map((project) => {
              const meta = statusMeta[project.status] || { label: project.status, className: "bg-slate-50 text-slate-600 border-slate-200" };
              return (
                <article key={project.id} className="group rounded-[1.35rem] border border-slate-200/90 bg-white/95 p-4 shadow-[0_18px_42px_-30px_rgba(15,23,42,.5)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_24px_55px_-30px_rgba(37,99,235,.28)] sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                        Project
                        {project.status === "active" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                      </div>
                      <h3 className="mt-1 truncate text-lg font-black text-slate-950">{project.title}</h3>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${meta.className}`}>{meta.label}</span>
                  </div>

                  <p className="mt-2 line-clamp-1 text-xs text-slate-500">{project.description || "No project description added."}</p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5">
                      <p className="text-[10px] font-semibold text-slate-400">Budget</p>
                      <p className="mt-0.5 text-sm font-black text-slate-900">{project.budget !== null ? `₹${Number(project.budget).toLocaleString("en-IN")}` : "Not specified"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5">
                      <p className="text-[10px] font-semibold text-slate-400">Deadline</p>
                      <p className="mt-0.5 text-sm font-black text-slate-900">{project.deadline ? new Date(project.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not specified"}</p>
                    </div>
                  </div>

                  <Link href={`/projects/${project.id}`} className="mt-3 flex h-10 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white transition hover:bg-blue-600">
                    Open Project <span className="ml-1.5">→</span>
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl">📁</div>
            <h3 className="mt-3 text-lg font-black">No {filter === "all" ? "projects" : filter} projects</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Try another project filter or create a new project.</p>
            {filter !== "all" && (
              <button type="button" onClick={() => activateFilter("all")} className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Show all projects</button>
            )}
          </div>
        )}

        {filter === "all" && sortedProjects.length > 4 && !showAll && (
          <button type="button" onClick={() => setShowAll(true)} className="mt-4 w-full rounded-xl border border-slate-200 bg-white/85 py-3 text-xs font-black text-blue-600 shadow-sm hover:border-blue-200 hover:bg-blue-50">
            Showing 4 of {sortedProjects.length} projects · View all projects →
          </button>
        )}
      </section>
    </>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
  active = false,
  onClick,
}: {
  icon: string;
  label: string;
  value: string;
  tone: "blue" | "emerald" | "indigo" | "violet";
  active?: boolean;
  onClick: () => void;
}) {
  const tones = {
    blue: "from-blue-50 to-cyan-50 text-blue-700 ring-blue-100",
    emerald: "from-emerald-50 to-teal-50 text-emerald-700 ring-emerald-100",
    indigo: "from-indigo-50 to-violet-50 text-indigo-700 ring-indigo-100",
    violet: "from-violet-50 to-fuchsia-50 text-violet-700 ring-violet-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[1.35rem] border bg-white/95 p-5 text-left shadow-[0_18px_42px_-30px_rgba(15,23,42,.55)] transition hover:-translate-y-1 hover:shadow-[0_25px_55px_-30px_rgba(37,99,235,.25)] ${active ? "border-blue-300 ring-2 ring-blue-500/10" : "border-slate-200/90"}`}
    >
      <div className={`absolute -right-8 -top-10 h-24 w-24 rounded-full bg-gradient-to-br opacity-70 blur-2xl ${tones[tone].split(" ").slice(0, 2).join(" ")}`} />
      <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone].split(" ").slice(0, 2).join(" ")} text-lg ring-1 ${tones[tone].split(" ")[2]}`}>
        {icon}
      </div>
      <div className="relative mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{value}</p>
        </div>
        <span className="text-xs font-black text-blue-600 opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100">View →</span>
      </div>
    </button>
  );
}
