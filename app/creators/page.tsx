import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import MarketplaceHeader from "@/components/MarketplaceHeader";
import { normalizeGigs, packagePriceRange } from "@/lib/gigs";

export const metadata = {
  title: "Find Creators & Freelancers | YOUTENT",
  description: "Discover talented video editors, thumbnail designers, voice-over artists, developers, writers, and other creative professionals on YOUTENT.",
  alternates: { canonical: "/creators" },
};

export default async function CreatorsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; service?: string }> }) {
  const params = await searchParams;
  const query = (params.q || "").trim().toLowerCase();
  const category = (params.category || "").trim();
  const service = (params.service || "").trim().toLowerCase();

  // Get freelancers and apply marketplace discovery filters.
  const { data: allCreators, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, username, bio, avatar_url, account_type, skills, categories, primary_category, starting_price, service_packages, gigs, portfolio, last_seen_at")
    .eq("account_type", "freelancer")
    .order("created_at", { ascending: false });

  // Backward-compatible discovery:
  // Older freelancer profiles may not have the new `categories` field yet.
  // Their skills still contain enough information to place them in a category.
  const categoryRules: Record<string, string[]> = {
    "Graphics & Design": [
      "graphics", "graphic", "design", "thumbnail", "logo", "illustration",
      "poster", "ui", "ux", "brand"
    ],
    "Video & Animation": [
      "video", "editing", "editor", "shorts", "reels", "youtube",
      "motion", "animation", "color grading", "intro", "outro"
    ],
    "Writing & Translation": [
      "writing", "writer", "script", "copywriting", "content", "translation",
      "proofreading", "storytelling", "research"
    ],
    "Music & Audio": [
      "audio", "voice", "voice over", "podcast", "sound", "music",
      "mixing", "mastering", "jingle"
    ],
    "Programming & Tech": [
      "web", "development", "developer", "app", "next.js", "react",
      "wordpress", "automation", "bug", "programming", "tech"
    ],
    "Digital Marketing": [
      "marketing", "seo", "social media", "youtube marketing", "email",
      "ads", "influencer", "analytics", "content strategy"
    ],
    "AI Services": [
      "ai", "artificial intelligence", "prompt", "chatbot", "automation",
      "ai content", "ai voice", "ai video", "ai image"
    ],
    "Photography": ["photography", "photographer", "photo", "portrait"],
    "Business": ["business", "consulting", "strategy"],
    "Finance": ["finance", "accounting", "bookkeeping"],
  };

  const normalize = (value: unknown) =>
    String(value || "").trim().toLowerCase();

  const creators = (allCreators || []).filter((creator) => {
    const creatorCategories = Array.isArray(creator.categories)
      ? creator.categories.map(normalize)
      : [];
    const creatorSkills = Array.isArray(creator.skills)
      ? creator.skills.map(normalize)
      : [];
    const creatorGigs = normalizeGigs(creator.gigs, creator.service_packages, creator.primary_category || creator.categories?.[0]);
    const gigText = creatorGigs.flatMap((gig) => [gig.title, gig.category, gig.description, ...gig.packages.map((pkg) => [pkg.name, pkg.description, pkg.scope || "", pkg.includes || ""].join(" "))]).join(" ");

    const haystack = [
      creator.full_name, creator.username, creator.bio,
      ...creatorSkills, ...creatorCategories, gigText,
    ].filter(Boolean).join(" ").toLowerCase();

    const wantedCategory = normalize(category);
    const rules = categoryRules[category] || [];
    const gigCategoryMatch = creatorGigs.some((gig) => normalize(gig.category) === wantedCategory);
    const legacyCategoryMatch = !wantedCategory || gigCategoryMatch || creatorCategories.includes(wantedCategory) || rules.some((rule) => haystack.includes(rule));
    const queryMatch = !query || haystack.includes(query);
    const serviceMatch = !service || haystack.includes(service);
    return legacyCategoryMatch && queryMatch && serviceMatch;
  });

  return (
    <main className="min-h-screen youtent-app-bg text-slate-950">

      <MarketplaceHeader accountType="client" />

      {/* ================= HERO / HEADER ================= */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">

        {/* Decorative background */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-10 h-80 w-80 rounded-full bg-violet-100/50 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-6 md:py-20 lg:px-8">

          <div className="max-w-3xl">

            {/* Badge */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-blue-600 shadow-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
              YOUTENT Marketplace
            </div>

            {/* Heading */}
            <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl md:text-6xl">
              Find the right
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                creative talent.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Discover talented video editors, thumbnail designers,
              voice-over artists and other creative professionals
              ready to bring your ideas to life.
            </p>

            {/* Small stats */}
            <div className="mt-8 flex flex-wrap gap-3">

              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  ✓
                </span>
                Verified profiles
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-50 text-green-600">
                  ₹
                </span>
                Flexible budgets
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                  ↗
                </span>
                Direct communication
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ================= MAIN ================= */}
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 md:py-16 lg:px-8">

        {/* Section heading */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
              Explore talent
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Browse Creators
            </h2>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Find someone who fits your project and budget.
            </p>
          </div>

          <div className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur">
            <span className={`mr-2 h-2 w-2 rounded-full ${creators.length ? "bg-emerald-500" : "bg-slate-300"}`} />
            {creators.length} {creators.length === 1 ? "creator" : "creators"} found
          </div>

        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold">
              !
            </span>

            <div>
              <p className="font-bold">Something went wrong</p>
              <p className="mt-1 text-red-600">
                Unable to load creators right now. Please try again later.
              </p>
            </div>
          </div>
        )}

        {/* ================= CREATOR GRID ================= */}
        {creators && creators.length > 0 ? (

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {creators.map((creator) => {
              const fullName = creator.full_name || "Creator";
              const skills: string[] = Array.isArray(creator.skills) ? creator.skills : [];
              const portfolio = Array.isArray(creator.portfolio) ? creator.portfolio : [];
              const gigs = normalizeGigs(creator.gigs, creator.service_packages, creator.primary_category || creator.categories?.[0]);
              const creatorUrl = `/creators/${creator.username || creator.id}`;
              const isOnline = Boolean(creator.last_seen_at) && Date.now() - new Date(creator.last_seen_at).getTime() < 2 * 60 * 1000;

              return (
                <article
                  key={creator.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_-22px_rgba(15,23,42,.45)] transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_38px_-24px_rgba(37,99,235,.35)]"
                >
                  <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

                  <div className="p-4 sm:p-5">
                    {/* Creator identity */}
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        {creator.avatar_url ? (
                          <img
                            src={creator.avatar_url}
                            alt={fullName}
                            className="h-12 w-12 rounded-xl object-cover ring-2 ring-slate-100"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-lg font-black text-white">
                            {fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span title={isOnline ? "Online" : "Offline"} className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h2 className="truncate text-base font-extrabold text-slate-950">{fullName}</h2>
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[9px] font-black text-blue-600">✓</span>
                        </div>
                        {creator.username && <p className="truncate text-xs text-slate-500">@{creator.username}</p>}
                      </div>

                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${isOnline ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </div>

                    {/* Published gigs — marketplace cards, not portfolio */}
                    {gigs.length > 0 ? (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-violet-600">Gigs & services</p>
                          {gigs.length > 3 && (
                            <Link href={creatorUrl} className="text-[10px] font-bold text-blue-600 hover:text-blue-700">View all →</Link>
                          )}
                        </div>

                        <div className="mt-2.5 grid gap-2.5">
                          {gigs.slice(0, 3).map((gig) => {
                            const range = packagePriceRange(gig);
                            const media = gig.packages?.flatMap((pkg) => pkg.media || [])[0] || gig.media?.[0];
                            return (
                              <Link
                                key={gig.id}
                                href={`${creatorUrl}#gig-${encodeURIComponent(gig.id)}`}
                                className="group/gig flex overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm"
                              >
                                <div className="h-[76px] w-[92px] shrink-0 overflow-hidden bg-gradient-to-br from-blue-100 via-indigo-100 to-violet-100">
                                  {media?.url && media.mediaType === "image" ? (
                                    <img src={media.url} alt={media.title || gig.title} className="h-full w-full object-cover transition duration-200 group-hover/gig:scale-105" />
                                  ) : media?.url && media.mediaType === "video" ? (
                                    <video src={media.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-2xl">✦</div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 px-3 py-2.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <h3 className="line-clamp-2 text-xs font-black leading-4 text-slate-900">{gig.title}</h3>
                                    <span className="shrink-0 text-[11px] font-black text-blue-700">₹{range.min.toLocaleString("en-IN")}</span>
                                  </div>
                                  <p className="mt-1 truncate text-[10px] font-semibold text-slate-500">{gig.category}</p>
                                  {gig.packages[0]?.scope && (
                                    <p className="mt-1 line-clamp-1 text-[10px] text-slate-500">{gig.packages[0].scope}</p>
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center">
                        <p className="text-xs font-bold text-slate-500">No gigs published yet</p>
                      </div>
                    )}

                    {/* Service + bio */}
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="line-clamp-2 min-h-[36px] text-xs leading-5 text-slate-500">
                        {creator.bio || "Creative professional ready to help with your project."}
                      </p>

                      {skills.length > 0 && (
                        <div className="mt-2 flex min-h-[25px] flex-wrap gap-1.5">
                          {skills.slice(0, 4).map((skill) => (
                            <span key={skill} className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                              {skill}
                            </span>
                          ))}
                          {skills.length > 4 && (
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">+{skills.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price + action */}
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Starting from</p>
                      <p className="text-lg font-black text-slate-950">₹{(gigs.flatMap((gig) => gig.packages.map((item) => Number(item.price) || 0)).filter((value) => value > 0)[0] ? Math.min(...gigs.flatMap((gig) => gig.packages.map((item) => Number(item.price) || 0)).filter((value) => value > 0)) : Number(creator.starting_price || 0)).toLocaleString("en-IN")}</p>
                    </div>
                    <Link
                      href={creatorUrl}
                      className="shrink-0 rounded-lg bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-600"
                    >
                      View & Hire →
                    </Link>
                  </div>
                </article>
              );
            })}

          </div>

        ) : (

          /* ================= NO CREATORS ================= */
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm">

            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full bg-blue-100/60 blur-3xl" />

            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-50 to-violet-50 text-3xl shadow-inner">
              ✨
            </div>

            <h2 className="relative mt-6 text-2xl font-black text-slate-950">
              No creators yet
            </h2>

            <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500 sm:text-base">
              There are no freelancers available right now.
              Be one of the first creators to showcase your skills
              and find clients on YOUTENT.
            </p>

            <Link
              href="/profile"
              className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-600/30"
            >
              Become a Freelancer
              <span>→</span>
            </Link>

          </div>

        )}

      </section>

      {/* ================= BOTTOM CTA ================= */}
      <section className="border-t border-slate-200 bg-white px-5 py-16 sm:px-6 md:py-20">

        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-slate-950 px-6 py-12 text-center shadow-2xl sm:px-10">

          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl text-blue-400">
            ✦
          </div>

          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Have a creative skill?
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
            Join YOUTENT, showcase your talent, connect with clients,
            and turn your creativity into opportunities.
          </p>

          <Link
            href="/profile"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-blue-50"
          >
            Create Your Profile
            <span>→</span>
          </Link>

        </div>

      </section>

    </main>
  );
}