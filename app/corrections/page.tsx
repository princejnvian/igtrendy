import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site-header";

export const metadata: Metadata = {
  title: "Corrections Policy",
  description: "How to report an error in an IGTrendy article and how corrections are handled.",
  alternates: { canonical: "/corrections" },
};

export default function CorrectionsPage() {
  return <main className="site-shell"><SiteHeader /><article className="article-page">
    <div className="eyebrow">ACCOUNTABILITY</div><h1>Corrections Policy</h1>
    <p className="article-excerpt">Accuracy matters. We want readers to tell us when something is wrong or missing.</p>
    <h2>How to report an error</h2><p>Send us the article URL, the specific sentence or detail in question, and a reliable source that helps verify the correction through our <Link href="/contact">Contact page</Link>.</p>
    <h2>How we review reports</h2><p>We review reports in good faith, compare the claim with reliable sources, and update an article when the evidence supports a correction. Significant changes may be explained in the article where appropriate.</p>
    <h2>What may be corrected</h2><p>Corrections can include names, dates, figures, match results, market data, attribution, context, broken source links and other factual mistakes. If a claim remains unverified, we aim to label that uncertainty rather than state it as fact.</p>
    <h2>Updates are not a substitute for corrections</h2><p>We do not intend to change timestamps merely to make a page appear new. Updates should reflect meaningful changes to the information or context.</p>
    <p>For our wider standards, read the <Link href="/editorial-policy">Editorial Policy</Link>.</p>
  </article></main>;
}