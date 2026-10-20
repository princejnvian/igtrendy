import Link from "next/link";
export default function IGTrendyLogo({ href = "/", className = "", priority = false, lightWordmark = false }: { href?: string; className?: string; priority?: boolean; lightWordmark?: boolean }) {
  return <Link href={href} className={`inline-flex items-center gap-2 ${className}`} aria-label="IGTrendy home">
    <img src="/igtrendy-mark.svg" alt="" width={38} height={38} />
    <span className={`text-xl font-black tracking-tight ${lightWordmark ? "text-white" : "text-slate-950"}`}>IGTrendy<span className="text-cyan-500">.</span></span>
  </Link>;
}
