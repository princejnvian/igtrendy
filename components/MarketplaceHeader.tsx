import Link from "next/link";
import YoutentLogo from "@/components/YoutentLogo";
import MarketplaceNavActions from "./MarketplaceNavActions";

type Category = {
  label: string;
  href: string;
  columns: { title: string; items: string[] }[];
};

const categories: Category[] = [
  {
    label: "Graphics & Design",
    href: "/creators?category=Graphics%20%26%20Design",
    columns: [
      { title: "Design", items: ["Logo Design", "Brand Style Guides", "Presentation Design", "Social Media Design"] },
      { title: "Visuals", items: ["Thumbnails", "Illustration", "Poster Design", "UI/UX Design"] },
    ],
  },
  {
    label: "Video & Animation",
    href: "/creators?category=Video%20%26%20Animation",
    columns: [
      { title: "Video", items: ["Video Editing", "YouTube Editing", "Shorts & Reels", "Video Ads"] },
      { title: "Animation", items: ["Motion Graphics", "2D/3D Animation", "Intro & Outro", "Color Grading"] },
    ],
  },
  {
    label: "Writing & Translation",
    href: "/creators?category=Writing%20%26%20Translation",
    columns: [
      { title: "Writing", items: ["Script Writing", "Content Writing", "Copywriting", "Storytelling"] },
      { title: "Language", items: ["Translation", "Proofreading", "Research", "Product Descriptions"] },
    ],
  },
  {
    label: "Music & Audio",
    href: "/creators?category=Music%20%26%20Audio",
    columns: [
      { title: "Audio", items: ["Voice Over", "Podcast Editing", "Audio Editing", "Sound Design"] },
      { title: "Music", items: ["Music Production", "Mixing & Mastering", "Jingles", "Background Music"] },
    ],
  },
  {
    label: "Programming & Tech",
    href: "/creators?category=Programming%20%26%20Tech",
    columns: [
      { title: "Development", items: ["Web Development", "App Development", "Next.js", "React"] },
      { title: "Tech", items: ["WordPress", "Automation", "Bug Fixes", "AI Integrations"] },
    ],
  },
  {
    label: "Digital Marketing",
    href: "/creators?category=Digital%20Marketing",
    columns: [
      { title: "Marketing", items: ["Social Media Marketing", "SEO", "YouTube Marketing", "Email Marketing"] },
      { title: "Growth", items: ["Paid Ads", "Content Strategy", "Influencer Marketing", "Analytics"] },
    ],
  },
  {
    label: "AI Services",
    href: "/creators?category=AI%20Services",
    columns: [
      { title: "Create with AI", items: ["AI Video", "AI Image Generation", "AI Content", "AI Voice"] },
      { title: "Build with AI", items: ["AI Automation", "Prompt Engineering", "Chatbot Development", "AI Consulting"] },
    ],
  },
];

export default function MarketplaceHeader({
  accountType = "client",
}: {
  accountType?: "client" | "freelancer";
}) {
  return (
    <header className="sticky top-0 z-[80] border-b border-slate-200/80 bg-slate-50/92 shadow-[0_8px_35px_-28px_rgba(15,23,42,.45)] backdrop-blur-2xl">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-4 px-4 sm:px-5 lg:px-8">
        <Link href="/dashboard" className="group flex shrink-0 items-center gap-2.5">
          <YoutentLogo className="h-10 w-10 shrink-0" priority />
          <span className="youtent-mobile-wordmark text-[18px] font-black tracking-[-0.045em] text-slate-950 sm:text-[21px]">
            YOUTENT<span className="text-blue-600">.</span>
          </span>
        </Link>

        <form action="/creators" className="hidden min-w-0 flex-1 lg:block lg:max-w-[560px]">
          <div className="flex h-11 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/90 shadow-inner transition focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(59,130,246,.07)]">
            <span className="flex w-11 items-center justify-center text-lg text-slate-400">⌕</span>
            <input name="q" placeholder="What service are you looking for today?" className="min-w-0 flex-1 bg-transparent px-1 text-sm font-medium outline-none placeholder:text-slate-400" />
            <button className="m-1 rounded-lg bg-slate-950 px-5 text-xs font-black text-white transition hover:bg-blue-600">Search</button>
          </div>
        </form>

        <nav className="ml-auto flex items-center gap-0.5">
          <MarketplaceNavActions accountType={accountType} />
        </nav>
      </div>

      <div className="hidden border-t border-slate-100 bg-slate-50/88 md:block">
        <div className="mx-auto flex h-11 max-w-[1440px] items-center gap-0.5 overflow-visible px-4 lg:px-8">
          <Link href="/creators" className="shrink-0 rounded-lg px-3 py-2 text-[13px] font-bold text-slate-700 transition hover:bg-slate-50">Trending 🔥</Link>

          {categories.map((category) => (
            <div key={category.label} className="group relative h-full shrink-0">
              <Link href={category.href} className="flex h-full items-center rounded-lg px-2.5 py-2 text-[12.5px] font-semibold text-slate-600 transition group-hover:bg-slate-50 group-hover:text-slate-950">
                {category.label}
              </Link>

              <div className="pointer-events-none invisible fixed left-1/2 top-[112px] z-[100] w-[min(980px,calc(100vw-32px))] -translate-x-1/2 translate-y-1 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <div className="overflow-hidden rounded-b-2xl border border-slate-200 bg-white shadow-[0_30px_80px_-25px_rgba(15,23,42,.28)]">
                  <div className="grid grid-cols-4 gap-7 p-7">
                    {category.columns.map((column) => (
                      <div key={column.title}>
                        <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-900">{column.title}</p>
                        <div className="space-y-0.5">
                          {column.items.map((item) => (
                            <Link key={item} href={`${category.href}&service=${encodeURIComponent(item)}`} className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-700">
                              {item}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="header-callout-panel rounded-2xl border border-transparent bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 p-5">
                      <p className="text-xs font-black uppercase tracking-wider text-blue-700">Explore</p>
                      <p className="header-callout-title mt-2 text-sm font-black text-slate-900">{category.label}</p>
                      <p className="header-callout-copy mt-2 text-xs leading-5 text-slate-500">Find creators, compare skills and start a project.</p>
                      <Link href={category.href} className="mt-4 inline-flex rounded-lg bg-slate-950 px-3.5 py-2 text-xs font-black text-white transition hover:bg-blue-600">Browse →</Link>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 bg-slate-50/70 px-7 py-3 text-xs font-semibold text-slate-500">Professional creators • Flexible budgets • Secure project flow</div>
                </div>
              </div>
            </div>
          ))}

          <Link href="/creators" className="ml-auto shrink-0 rounded-lg px-3 py-2 text-[12.5px] font-bold text-blue-600 transition hover:bg-blue-50">All categories →</Link>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-2.5 lg:hidden">
        <form action="/creators" className="flex h-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <span className="flex w-10 items-center justify-center text-slate-400">⌕</span>
          <input name="q" placeholder="Search creators or services" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          <button className="px-3 text-xs font-black text-blue-600">Search</button>
        </form>
      </div>
    </header>
  );
}
