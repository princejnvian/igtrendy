import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site-header";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Important information about IGTrendy's news, sports, stock-market and cryptocurrency coverage.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return <main className="site-shell"><SiteHeader /><article className="article-page">
    <div className="eyebrow">IMPORTANT INFORMATION</div><h1>Disclaimer</h1>
    <p className="article-excerpt">Please read this information when using IGTrendy.</p>
    <h2>General information</h2><p>IGTrendy publishes news, explainers and commentary for general information. We make reasonable efforts to use reliable sources, but breaking stories and third-party information can change or contain errors. Readers should check linked primary sources before relying on important details.</p>
    <h2>Stock market and cryptocurrency</h2><p>Market and cryptocurrency content is educational and informational only. It is not investment, financial, tax or legal advice, and it is not a recommendation to buy, sell or hold any security or digital asset. Prices and market conditions can change rapidly; figures may be delayed or differ between providers. Always verify current data with the relevant exchange, issuer or regulated professional and consider your own circumstances and risk tolerance.</p>
    <h2>Sports and entertainment</h2><p>Fixtures, scores, line-ups, release dates, casting reports and event details may change. Rumours and unconfirmed reports should not be treated as official announcements. We aim to identify uncertainty and link to reliable sources.</p>
    <h2>External links and advertising</h2><p>Links to third-party websites are provided for context. IGTrendy does not control those websites or guarantee their content. If advertising or affiliate relationships are introduced, they should be clearly identified in accordance with applicable requirements.</p>
    <h2>Contact</h2><p>For corrections or questions, visit our <Link href="/contact">Contact page</Link> or review our <Link href="/editorial-policy">Editorial Policy</Link>.</p>
  </article></main>;
}