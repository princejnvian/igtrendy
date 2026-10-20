import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarketplaceHeader from "@/components/MarketplaceHeader";
import DashboardProjectsPanel from "@/components/DashboardProjectsPanel";
import SiteFooter from "@/components/SiteFooter";

type Creator = {
  id: string;
  full_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  skills: string[] | null;
  portfolio: Array<{ id: string; url: string; mediaType: string; title: string }> | null;
  starting_price: number | null;
};

const categories = [
  { icon: "✂", label: "Video Editing", category: "Video & Animation" },
  { icon: "✦", label: "Graphics & Design", category: "Graphics & Design" },
  { icon: "▶", label: "YouTube Thumbnails", category: "Graphics & Design" },
  { icon: "◉", label: "Voice Over", category: "Music & Audio" },
  { icon: "◇", label: "2D/3D Animation", category: "Video & Animation" },
  { icon: "♫", label: "Audio/Music", category: "Music & Audio" },
];

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, username, bio, avatar_url, account_type, skills"
    )
    .eq("id", user.id)
    .maybeSingle();

  const fullName =
    profile?.full_name || user.user_metadata?.full_name || "User";

  const accountType =
    (profile?.account_type || user.user_metadata?.account_type || "client") as "client" | "freelancer";

  const isFreelancer = accountType === "freelancer";

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, title, description, budget, deadline, status, created_at, client_id, freelancer_id"
    )
    .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const { data: creators } = isFreelancer
    ? { data: [] as Creator[] }
    : await supabase
        .from("profiles")
        .select("id, full_name, username, bio, avatar_url, skills, portfolio, starting_price")
        .eq("account_type", "freelancer")
        .neq("id", user.id)
        .order("created_at", { ascending: false })
        .limit(6);

  const projectCount = projects?.length || 0;
  const activeProjects =
    projects?.filter((project) => project.status === "active").length || 0;
  const completedProjects =
    projects?.filter((project) => project.status === "completed").length || 0;

  const displayCreators = (creators || []).slice(0, 3);

  return (
    <main className="dashboard-shell youtent-app-bg min-h-screen text-slate-950">
      <MarketplaceHeader accountType={accountType} />

      {/* ================= DASHBOARD ================= */}
      <div className="mx-auto max-w-[1400px] px-5 pb-12 pt-7 sm:px-7 lg:px-8">
        {/* Welcome */}
        <section className="relative flex flex-col justify-between gap-5 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/75 px-6 py-7 shadow-[0_25px_70px_-50px_rgba(15,23,42,.4)] backdrop-blur-xl sm:flex-row sm:items-end sm:px-8">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Dashboard
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Welcome back, {fullName} <span className="text-2xl">👋</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              {isFreelancer
                ? "Manage your projects and creator profile from one place."
                : "Manage your projects and discover talented creators for your next idea."}
            </p>
          </div>

          {!isFreelancer && (
            <Link
              href="/creators"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
            >
              Find a Creator <span className="ml-2">→</span>
            </Link>
          )}
        </section>

        {!isFreelancer && (
          <section className="mt-6 rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">Find a service</p><h2 className="mt-1 text-xl font-black">What do you need help with?</h2></div>
              <Link href="/creators" className="text-sm font-bold text-blue-600">Browse all creators →</Link>
            </div>
            <form action="/creators" className="mt-4 flex gap-2">
              <input name="q" placeholder="Search video editing, thumbnails, voice over, web development..." className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
              <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-600">Search</button>
            </form>
          </section>
        )}

        {isFreelancer && (
          <div className="mt-5 flex justify-end"><Link href="/wallet" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-600">Open Wallet →</Link></div>
        )}

        {/* Metrics + interactive project controls */}
        <DashboardProjectsPanel
          accountType={accountType}
          projectCount={projectCount}
          activeProjects={activeProjects}
          completedProjects={completedProjects}
          projects={projects || []}
        />

        {/* Recommended Creators */}
        {!isFreelancer && (
          <section className="pt-7">
            <SectionHeading title="Recommended Creators for You" actionLabel="View all" actionHref="/creators" />

            {displayCreators.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-3">
                {displayCreators.map((creator) => {
                  const creatorName = creator.full_name || "Creator";
                  const creatorSkills = Array.isArray(creator.skills) ? creator.skills : [];

                  return (
                    <article
                      key={creator.id}
                      className="group premium-card p-4 transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="flex items-center gap-3">
                        {creator.avatar_url ? (
                          <img
                            src={creator.avatar_url}
                            alt={creatorName}
                            className="h-12 w-12 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 font-black text-white">
                            {creatorName.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="truncate font-bold text-slate-950">{creatorName}</h3>
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[9px] font-black text-blue-600">
                              ✓
                            </span>
                          </div>
                          <p className="truncate text-xs text-slate-500">
                            {creatorSkills[0] || creator.bio || "Creative professional"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex min-h-6 flex-wrap gap-1.5">
                        {creatorSkills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      {Array.isArray(creator.portfolio) && creator.portfolio.length > 0 && (
                        <Link href={`/creators/${creator.username || creator.id}`} className="mt-4 block overflow-hidden rounded-xl bg-slate-100">
                          {creator.portfolio[0]?.mediaType === "image" ? <img src={creator.portfolio[0].url} alt={creator.portfolio[0].title || "Portfolio"} className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.02]" /> : <div className="flex h-40 items-center justify-center text-sm font-bold text-slate-400">View portfolio samples →</div>}
                        </Link>
                      )}

                      <Link
                        href={`/creators/${creator.username || creator.id}`}
                        className="mt-3 flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                      >
                        View Profile
                      </Link>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                No creators are available yet. Check back soon.
              </div>
            )}
          </section>
        )}

        {/* Categories */}
        <section className="pt-7">
          <SectionHeading title="Browse by Category" actionLabel="All categories" actionHref="/creators" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <Link
                key={category.label}
                href={`/creators?category=${encodeURIComponent(category.category)}`}
                className="group flex min-h-[64px] items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/85 px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5 hover:text-blue-600"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-violet-50 text-base text-blue-600 shadow-inner">
                  {category.icon}
                </span>
                <span>{category.label}</span>
              </Link>
            ))}
          </div>
        </section>


      </div>
      <SiteFooter />
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  badge,
}: {
  icon: string;
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <div className="premium-card p-4 transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-5">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-lg">{icon}</span>
        {badge && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">{badge}</span>}
      </div>
      <p className="mt-4 text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-0.5 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
  actionLabel,
  actionHref,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-500 sm:text-sm">{subtitle}</p>}
      </div>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="shrink-0 text-xs font-bold text-blue-600 hover:text-blue-700">
          {actionLabel} →
        </Link>
      ) : actionLabel ? (
        <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
          {actionLabel}
        </span>
      ) : null}
    </div>
  );
}
