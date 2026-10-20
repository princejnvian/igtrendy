import Link from "next/link";
import YoutentLogo from "@/components/YoutentLogo";

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <YoutentLogo href="/" />
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
            YOUTENT connects clients with talented creators and freelancers through a secure project workflow.
          </p>
        </div>
        <FooterGroup title="Platform" links={[
          ["Browse Creators", "/creators"], ["How it works", "/about"], ["FAQ", "/faq"],
        ]} />
        <FooterGroup title="Company" links={[
          ["About YOUTENT", "/about"], ["Contact Us", "/contact"], ["Security", "/security"],
        ]} />
        <FooterGroup title="Legal" links={[
          ["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"],
        ]} />
      </div>
      <div className="border-t border-slate-100 px-5 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} YOUTENT. All rights reserved.
      </div>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[.16em] text-slate-400">{title}</p>
      <div className="mt-3 space-y-2">
        {links.map(([label, href]) => <Link key={href + label} href={href} className="block text-sm font-semibold text-slate-600 hover:text-blue-600">{label}</Link>)}
      </div>
    </div>
  );
}
