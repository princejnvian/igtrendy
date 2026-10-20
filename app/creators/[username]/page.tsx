import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import HireForm from "./HireForm";
import GigPackages from "./GigPackages";
import { normalizeGigs } from "@/lib/gigs";
import type { ServicePackage } from "@/lib/gigs";
import MarketplaceHeader from "@/components/MarketplaceHeader";
import MessageCreatorButton from "./MessageCreatorButton";
import PortfolioLightbox from "./PortfolioLightbox";

type PortfolioItem = {
  id: string;
  title: string;
  description?: string;
  url: string;
  mediaType: "image" | "video" | "audio";
  category?: string;
};



type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  const cleanUsername = username.toLowerCase();
  const { data: creator } = await supabaseAdmin
    .from("profiles")
    .select("full_name, username, bio, avatar_url, primary_category, categories")
    .eq("username", cleanUsername)
    .eq("account_type", "freelancer")
    .maybeSingle();

  if (!creator) {
    return {
      title: "Creator Not Found | YOUTENT",
      robots: { index: false, follow: false },
    };
  }

  const name = creator.full_name || creator.username || "Creator";
  const categories = Array.isArray(creator.categories) ? creator.categories : [];
  const specialty = creator.primary_category || categories[0] || "Freelance creative services";
  const description = String(creator.bio || `${name} offers ${specialty} services on YOUTENT.`).replace(/\s+/g, " ").trim().slice(0, 155);
  const canonical = `/creators/${encodeURIComponent(String(creator.username || cleanUsername))}`;

  return {
    title: `${name} — ${specialty} | YOUTENT`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${name} — ${specialty} | YOUTENT`,
      description,
      url: canonical,
      siteName: "YOUTENT",
      type: "profile",
      ...(creator.avatar_url ? { images: [{ url: creator.avatar_url, alt: name }] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

async function resolveGigMedia(gigs: import("@/lib/gigs").CreatorGig[]) {
  const markerPatterns = [
    "/storage/v1/object/public/portfolio-media/",
    "/storage/v1/object/sign/portfolio-media/",
    "/storage/v1/object/authenticated/portfolio-media/",
  ];

  function getPath(media: Pick<import("@/lib/gigs").GigMedia, "path" | "url">) {
    if (media.path) return media.path;
    const raw = media.url || "";
    for (const marker of markerPatterns) {
      const index = raw.indexOf(marker);
      if (index >= 0) {
        const rest = raw.slice(index + marker.length).split("?")[0];
        return decodeURIComponent(rest);
      }
    }
    return "";
  }

  const all = gigs.flatMap((gig) => [
    ...gig.media.map((media) => ({ gigId: gig.id, packageId: "", media })),
    ...gig.packages.flatMap((pkg) => pkg.media.map((media) => ({ gigId: gig.id, packageId: pkg.id, media }))),
  ]);
  if (!all.length) return gigs;
  const paths = [...new Set(all.map(({ media }) => getPath(media)).filter(Boolean))];
  if (!paths.length) return gigs;

  const { data: signed } = await supabaseAdmin.storage.from("portfolio-media").createSignedUrls(paths, 60 * 60);
  const signedByPath = new Map<string, string>();
  paths.forEach((path, index) => {
    const url = signed?.[index]?.signedUrl;
    if (url) signedByPath.set(path, url);
  });

  const signMedia = (media: import("@/lib/gigs").GigMedia): import("@/lib/gigs").GigMedia => {
    const path = getPath(media);
    const signedUrl = path ? signedByPath.get(path) : undefined;
    return { ...media, path: path || media.path, url: signedUrl || media.url };
  };

  return gigs.map((gig) => ({
    ...gig,
    media: gig.media.map(signMedia),
    packages: gig.packages.map((pkg) => ({ ...pkg, media: pkg.media.map(signMedia) })),
  }));
}

export default async function CreatorProfilePage({ params }: Props) {
  const { username } = await params;
  const cleanUsername = username.toLowerCase();

  const { data: creator } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, username, bio, avatar_url, account_type, skills, categories, primary_category, starting_price, service_packages, gigs, portfolio, last_seen_at"
    )
    .eq("username", cleanUsername)
    .eq("account_type", "freelancer")
    .maybeSingle();

  if (!creator) notFound();

  const fullName = creator.full_name || "Creator";
  const isOnline = Boolean(creator.last_seen_at) && Date.now() - new Date(creator.last_seen_at).getTime() < 2 * 60 * 1000;
  const skills: string[] = Array.isArray(creator.skills) ? creator.skills : [];
  const categories: string[] = Array.isArray(creator.categories) ? creator.categories : [];
  const portfolio: PortfolioItem[] = Array.isArray(creator.portfolio) ? creator.portfolio : [];
  const rawGigs = normalizeGigs(creator.gigs, creator.service_packages, creator.primary_category || categories[0]);
  const gigs = await resolveGigMedia(rawGigs);
  const firstGig = gigs[0];
  const packages: ServicePackage[] = firstGig?.packages || [];

  const startingPrice =
    Number(creator.starting_price) || Number(packages[0]?.price) || 0;

  const { data: reviewRows } = await supabaseAdmin
    .from("reviews")
    .select("rating")
    .eq("freelancer_id", creator.id);

  const reviewCount = reviewRows?.length || 0;
  const averageRating = reviewCount
    ? (
        reviewRows!.reduce((sum, item) => sum + Number(item.rating), 0) /
        reviewCount
      ).toFixed(1)
    : "New";

  const creatorUrl = `https://youtent.in/creators/${encodeURIComponent(String(creator.username))}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: fullName,
    url: creatorUrl,
    ...(creator.avatar_url ? { image: creator.avatar_url } : {}),
    description: creator.bio || undefined,
    jobTitle: creator.primary_category || categories[0] || "Freelancer",
    ...(reviewCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(averageRating), reviewCount } } : {}),
  };

  return (
    <main className="min-h-screen youtent-app-bg overflow-x-hidden text-slate-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <MarketplaceHeader accountType="client" />

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href="/creators"
          className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/75 px-3.5 py-2 text-sm font-bold text-slate-600 shadow-sm backdrop-blur transition hover:border-blue-200 hover:text-blue-600"
        >
          ← Back to Creators
        </Link>

        <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-[0_24px_70px_-40px_rgba(30,64,175,.35),0_8px_24px_rgba(15,23,42,.06)] sm:rounded-[2rem]">
          {/* Creator hero / identity */}
          <div className="relative min-h-[360px] overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 sm:min-h-[330px] md:min-h-[350px]">
            <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -left-28 bottom-[-10rem] h-96 w-96 rounded-full bg-cyan-300/10 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,.09)_45%,transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,.14),transparent_30%)]" />

            <div className="relative flex min-h-[360px] flex-col justify-between p-5 sm:min-h-[330px] sm:p-7 lg:min-h-[350px] lg:p-9">
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/85 backdrop-blur">
                  YOUTENT CREATOR
                </span>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold backdrop-blur ${isOnline ? "border-emerald-200/40 bg-emerald-400/15 text-emerald-50" : "border-white/20 bg-white/10 text-white/75"}`}>
                  <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-300 shadow-[0_0_0_4px_rgba(52,211,153,.14)]" : "bg-slate-300"}`} />
                  {isOnline ? "Online • Available for projects" : "Offline"}
                </span>
              </div>

              <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end">
                  <div className="relative shrink-0">
                    {creator.avatar_url ? (
                      <img
                        src={creator.avatar_url}
                        alt={fullName}
                        className="h-28 w-28 rounded-[1.35rem] border-4 border-white/90 object-cover shadow-2xl ring-1 ring-white/30 sm:h-32 sm:w-32"
                      />
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center rounded-[1.35rem] border-4 border-white/90 bg-white/15 text-4xl font-black text-white shadow-2xl backdrop-blur sm:h-32 sm:w-32">
                        {fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span title={isOnline ? "Online" : "Offline"} className={`absolute bottom-2 right-2 h-5 w-5 rounded-full border-4 border-white ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                  </div>

                  <div className="min-w-0 text-white">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">
                      {creator.primary_category || categories[0] || "Freelance professional"}
                    </p>
                    <h1 className="mt-1 truncate text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">{fullName}</h1>
                    <p className="mt-1 text-sm font-medium text-blue-100">@{creator.username}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-bold backdrop-blur">
                        <span className="text-amber-300">★</span> {averageRating}
                        <span className="font-medium text-blue-100">({reviewCount} reviews)</span>
                      </span>
                      <a href="#gigs" className="rounded-full bg-white/10 px-3 py-1.5 font-bold text-blue-50 backdrop-blur transition hover:bg-white/20">
                        {gigs.length} {gigs.length === 1 ? "gig" : "gigs"}
                      </a>
                      <span className="rounded-full bg-white/10 px-3 py-1.5 font-bold text-blue-50 backdrop-blur">
                        {portfolio.length} portfolio {portfolio.length === 1 ? "item" : "items"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid w-full gap-2 sm:max-w-sm sm:grid-cols-2 lg:w-auto lg:max-w-none">
                  <MessageCreatorButton creatorId={creator.id} />
                  {firstGig?.packages?.length ? (
                    <HireForm creatorId={creator.id} creatorName={fullName} gigId={firstGig.id} gigTitle={firstGig.title} packages={firstGig.packages} />
                  ) : gigs.length ? (
                    <a href={`#gig-${gigs[0].id}`} className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50">
                      View gigs →
                    </a>
                  ) : (
                    <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-xs font-bold text-white/70 backdrop-blur">
                      No published gig yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="border-t border-slate-100/90 bg-slate-50/35 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_350px]">
              <div className="min-w-0">
                <section>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
                    About
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {creator.primary_category ||
                      categories[0] ||
                      "Creative professional"}
                  </h2>
                  <p className="mt-3 max-w-3xl whitespace-pre-wrap text-[15px] leading-7 text-slate-600">
                    {creator.bio || "This creator hasn't added a bio yet."}
                  </p>
                </section>

                {categories.length > 0 && (
                  <section className="mt-8">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-600">
                      Categories
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {categories.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                <section className="mt-8">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
                    Expertise
                  </p>
                  <h2 className="mt-1 text-2xl font-black">Skills & expertise</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {skills.length ? (
                      skills.map((item) => (
                        <span
                          key={item}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm"
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">
                        No skills added yet.
                      </span>
                    )}
                  </div>
                </section>

                <section id="gigs" className="mt-10 scroll-mt-24">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-600">Services</p>
                  <h2 className="mt-1 text-2xl font-black">Gigs by {fullName}</h2>
                  <p className="mt-2 text-sm text-slate-500">Choose the exact service you need. Each gig has its own Basic, Standard and Premium packages.</p>
                  <div className="mt-5 space-y-5">
                    {gigs.map((gig) => (
                      <GigPackages key={gig.id} creatorId={creator.id} creatorName={fullName} gigId={gig.id} gigTitle={gig.title} category={gig.category} subcategory={gig.subcategory} tags={gig.tags} packages={gig.packages} media={gig.media} startingPrice={Number(gig.packages[0]?.price) || startingPrice} />
                    ))}
                  </div>
                </section>

                <section className="mt-10">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">
                        Portfolio
                      </p>
                      <h2 className="mt-1 text-2xl font-black">Selected work</h2>
                    </div>
                    <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm">
                      {portfolio.length} items
                    </span>
                  </div>

                  {portfolio.length ? (
                    <PortfolioLightbox items={portfolio} />
                  ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                      Portfolio samples will appear here when this creator adds
                      their work.
                    </div>
                  )}
                </section>
              </div>

              {/* Pricing */}
              <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
                <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-[0_18px_50px_-32px_rgba(15,23,42,.35)] sm:p-5">
                  <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                      Service pricing
                    </p>
                    <p className="mt-2 text-sm text-slate-500">Starting from</p>
                    <p className="text-4xl font-black tracking-tight">
                      ₹{startingPrice.toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {packages.length ? (
                      packages.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-black">{item.name}</h3>
                            <span className="shrink-0 text-lg font-black">
                              ₹{Number(item.price).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">
                            {item.description}
                          </p>
                          {(item.scope || item.includes) && (
                            <div className="mt-3 space-y-2 text-xs text-slate-600">
                              {item.scope && <p><span className="font-black text-slate-700">Scope:</span> {item.scope}</p>}
                              {item.includes && <p className="whitespace-pre-wrap"><span className="font-black text-slate-700">Includes:</span> {item.includes}</p>}
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
                            <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">
                              {item.deliveryDays} day delivery
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">
                              {item.revisions} revisions
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
                        Custom pricing available through a project request.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 p-5 text-white shadow-[0_18px_35px_-20px_rgba(79,70,229,.55)]">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                      Ready to work together?
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-white/95">
                      Choose a Basic, Standard or Premium package and place the order directly.
                    </p>
                    <div className="mt-4">
                      {packages[0] ? (
                        <HireForm
                          creatorId={creator.id}
                          creatorName={fullName}
                          gigId={firstGig.id}
                          gigTitle={firstGig.title}
                          packages={packages}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
