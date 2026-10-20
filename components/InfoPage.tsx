import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import YoutentLogo from "@/components/YoutentLogo";

export default function InfoPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="youtent-app-bg min-h-screen text-slate-950">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0c0a18]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <YoutentLogo href="/" lightWordmark />
          <div className="flex items-center gap-2">
            <Link href="/creators" className="hidden rounded-xl px-3 py-2 text-sm font-bold text-white/75 hover:bg-white/10 hover:text-white sm:inline-flex">Browse Creators</Link>
            <Link href="/dashboard" className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-sm hover:bg-blue-50">Dashboard</Link>
          </div>
        </div>
      </nav>
      <section className="mx-auto max-w-4xl px-5 py-14 sm:px-6 sm:py-20">
        <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">{intro}</p>
        <div className="mt-10 rounded-[28px] border border-white/10 bg-white/[.96] p-6 shadow-2xl shadow-black/20 sm:p-9">
          {children}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

export function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border-b border-slate-100 py-6 last:border-0 last:pb-0 first:pt-0"><h2 className="text-xl font-black text-slate-950">{title}</h2><div className="mt-3 text-sm leading-7 text-slate-600">{children}</div></section>;
}
