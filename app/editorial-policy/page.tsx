import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site-header";

export const metadata: Metadata = {
  title: "Editorial Policy",
  description: "How IGTrendy researches, verifies, writes and updates stories across sports, markets, crypto, gaming and entertainment.",
  alternates: { canonical: "/editorial-policy" },
};

export default function EditorialPolicyPage() {
  return <main className="site-shell"><SiteHeader /><article className="article-page">
    <div className="eyebrow">TRANSPARENCY</div><h1>Editorial Policy</h1>
    <p className="article-excerpt">Our standards for accuracy, sourcing, independence and responsible coverage.</p>
    <h2>Our purpose</h2><p>IGTrendy covers developing stories across sports, cricket and IPL, football, markets, cryptocurrency, gaming, Bollywood, Hollywood, movies, streaming and wider news. Our goal is to help readers understand what happened, why it matters and what is known so far.</p>
    <h2>Research and sources</h2><p>We aim to use primary sources wherever practical, including official league and team announcements, company filings, stock-exchange notices, regulator statements, studio announcements and official release information. Reputable reporting may be used for context. Articles should link to sources and distinguish confirmed facts from claims, analysis and speculation.</p>
    <h2>AI-assisted publishing</h2><p>Digital tools may assist research, drafting and formatting. They do not remove our responsibility to check claims, links, dates and context. Automated drafts should be reviewed and corrected when errors are identified. We do not intentionally publish fabricated quotes, scores, prices, sources or announcements.</p>
    <h2>Breaking news and updates</h2><p>Developing stories can change. We aim to make important corrections when reliable new information becomes available and to avoid presenting rumours as confirmed news. Publication or update times should reflect meaningful work, not be changed merely to make an article appear fresh.</p>
    <h2>Images and attribution</h2><p>We aim to use images that we own, have permission to use, or that are available under a suitable licence. Where required, credits and licence information should be shown. Readers and rights holders can contact us about attribution or image concerns.</p>
    <h2>Financial and sports coverage</h2><p>Market coverage is informational and is not personalised investment advice. Sports reports should rely on reliable sources for fixtures, scores, injuries and official team news, and should identify uncertainty where relevant.</p>
    <h2>Contact and corrections</h2><p>If you notice an error or have a sourcing concern, please use our <Link href="/contact">Contact page</Link> and include the article URL and supporting information. See our <Link href="/corrections">Corrections Policy</Link>.</p>
  </article></main>;
}