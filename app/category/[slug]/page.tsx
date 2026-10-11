import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import SiteHeader from "@/components/site-header";

const categories: Record<string, { title: string; description: string; intro: string; articleCategories: string[]; related: [string, string][] }> = {
  news: { title: "Latest News & Trending Stories", description: "Read the latest verified news, important updates and trending stories from India and around the world.", intro: "Follow the stories shaping conversations across technology, business, culture and the wider world. IGTrendy aims to add context, reliable sources and clear explanations—not just repeat headlines.", articleCategories: ["News"], related: [["sports","Sports"],["stock-market","Stock Market"],["bollywood","Bollywood"],["hollywood","Hollywood"]] },
  sports: { title: "Sports News & Updates", description: "Latest sports news, match updates, tournaments, cricket, IPL, football, tennis and esports coverage.", intro: "Catch up on major sporting stories, tournament developments, team updates and results. Our sports coverage spans cricket and IPL, international football, tennis, esports and other events, with dates and context checked against reliable sources.", articleCategories: ["Sports","Cricket","IPL","Football","Tennis","Esports"], related: [["cricket","Cricket"],["ipl","IPL"],["football","Football"],["gaming","Gaming"]] },
  cricket: { title: "Cricket News & Updates", description: "Cricket news, international matches, team updates, tournament results and major cricket stories.", intro: "Read cricket updates covering international fixtures, teams, players, tournaments and major developments. Reports should distinguish confirmed team announcements from speculation and include source links.", articleCategories: ["Cricket","IPL"], related: [["ipl","IPL"],["sports","All Sports"],["news","Latest News"]] },
  ipl: { title: "IPL News & Updates", description: "Indian Premier League news, team updates, player developments, auction news and match coverage.", intro: "Follow Indian Premier League developments, team announcements, player news, auction updates and match coverage. Schedules and results should be checked against official league or team sources.", articleCategories: ["IPL"], related: [["cricket","Cricket"],["sports","All Sports"]] },
  football: { title: "Football News & Updates", description: "Football news from the Premier League, Champions League, international football, transfers and major tournaments.", intro: "Follow major football stories from club competitions and international tournaments, including match reports, confirmed transfers and official team announcements.", articleCategories: ["Football"], related: [["sports","All Sports"],["news","Latest News"]] },
  tennis: { title: "Tennis News & Updates", description: "Tennis tournament news, player updates and major stories from the ATP, WTA and Grand Slam tours.", intro: "Discover major tennis results, tournament developments and player updates, with match facts and dates checked against reliable sources.", articleCategories: ["Tennis"], related: [["sports","All Sports"],["news","Latest News"]] },
  "stock-market": { title: "Stock Market News: India & Global Markets", description: "Stock market news covering Indian stocks, Nifty, Sensex, company earnings, global markets and major economic updates.", intro: "Understand the developments moving Indian and international markets, including company results, exchange announcements, economic data and policy decisions. Market reports should state the date and time of data and separate factual reporting from analysis. This is informational coverage, not personalised investment advice.", articleCategories: ["Stock Market","Indian Stocks","Global Markets"], related: [["crypto","Crypto News"],["news","Latest News"]] },
  crypto: { title: "Cryptocurrency & Crypto Market News", description: "Crypto news covering Bitcoin, Ethereum, digital assets, blockchain developments, regulation and market movements.", intro: "Follow important cryptocurrency and blockchain developments with clear timestamps, reliable sources and careful explanations of market volatility. Coverage is for information only and is not investment advice.", articleCategories: ["Crypto"], related: [["stock-market","Stock Market"],["news","Latest News"]] },
  bollywood: { title: "Bollywood News, Films & Box Office", description: "Latest Bollywood news, Hindi cinema releases, trailers, casting announcements and box-office updates.", intro: "Read updates from Hindi cinema, including confirmed film announcements, trailers, cast news and box-office reporting. We aim to separate official announcements from rumours and clearly attribute reports.", articleCategories: ["Bollywood"], related: [["movies","Movies"],["hollywood","Hollywood"],["web-series","Web Series"]] },
  hollywood: { title: "Hollywood News, Movies & Trailers", description: "Hollywood news, film announcements, trailers, casting, studios and box-office updates.", intro: "Keep up with Hollywood film news, official trailers, casting announcements, studio updates and box-office stories, with links to primary sources wherever possible.", articleCategories: ["Hollywood"], related: [["movies","Movies"],["bollywood","Bollywood"],["web-series","Web Series"]] },
  gaming: { title: "Gaming News, Releases & Updates", description: "Gaming news for PC, PlayStation, Xbox, Nintendo, esports, upcoming releases and major game updates.", intro: "Explore gaming news, release updates, official announcements, platform developments and esports stories. Dates and features that are not officially confirmed should be labelled clearly.", articleCategories: ["Gaming","Esports"], related: [["sports","Sports"],["movies","Movies"],["trending","Trending"]] },
  movies: { title: "Movie News, Trailers & Release Updates", description: "Movie news, trailers, release dates, casting and film updates from Bollywood, Hollywood and global cinema.", intro: "Find movie announcements, trailer breakdowns, release-date updates and film-industry news. We distinguish official release information from rumours and link to reliable sources.", articleCategories: ["Movies","Bollywood","Hollywood"], related: [["bollywood","Bollywood"],["hollywood","Hollywood"],["web-series","Web Series"]] },
  "web-series": { title: "Web Series & Streaming News", description: "Streaming news, web-series releases, trailers, renewals, casting and updates from major platforms.", intro: "Follow streaming releases, official renewal announcements, trailers and cast updates across major platforms. Unconfirmed release dates are clearly identified as such.", articleCategories: ["Web Series"], related: [["movies","Movies"],["bollywood","Bollywood"],["hollywood","Hollywood"]] },
  events: { title: "Events, Awards & Major Announcements", description: "Trending events, award ceremonies, festivals, premieres and important announcements.", intro: "Explore notable events, awards, premieres and public announcements with practical context, confirmed dates and reliable source links.", articleCategories: ["Events"], related: [["sports","Sports"],["movies","Movies"],["news","Latest News"]] },
  theories: { title: "Theories, Mysteries & Deep Dives", description: "Thoughtful explainers, theories, mysteries and deeper analysis of trending topics.", intro: "Go beyond the headline with context-rich explainers and theories. Speculation is labelled clearly and separated from evidence and confirmed facts.", articleCategories: ["Theories","Explained"], related: [["trending","Trending"],["news","Latest News"]] },
  explained: { title: "Explained: Context Behind the Headlines", description: "Clear explainers that break down complex news, technology, culture, markets and internet trends.", intro: "Understand the background, key facts and wider implications behind important stories through structured, source-led explainers.", articleCategories: ["Explained","Theories"], related: [["news","Latest News"],["stock-market","Stock Market"],["crypto","Crypto News"]] },
  trending: { title: "What's Trending Right Now", description: "Discover fresh trending stories across sports, markets, crypto, gaming, movies, streaming and global news.", intro: "A curated view of what people are talking about across entertainment, sports, markets and the wider internet. We prioritise new developments, check source dates and avoid republishing the same story under a slightly changed headline.", articleCategories: ["Trending","News","Sports","Cricket","IPL","Football","Tennis","Esports","Stock Market","Indian Stocks","Global Markets","Crypto","Bollywood","Hollywood","Gaming","Movies","Web Series","Events","Theories","Explained"], related: [["sports","Sports"],["stock-market","Stock Market"],["crypto","Crypto"],["bollywood","Bollywood"],["gaming","Gaming"]] },
};

function getCategory(slug: string) {
  return categories[slug] || {
    title: slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "),
    description: "The latest stories and updates from IGTrendy.",
    intro: "Explore the latest stories and updates from IGTrendy, with context and source links.",
    articleCategories: [slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")],
    related: [["trending","Trending"],["news","Latest News"]] as [string,string][],
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  return {
    title: category.title,
    description: category.description,
    alternates: { canonical: \`/category/\${slug}\` },
    openGraph: { title: category.title, description: category.description, type: "website", siteName: "IGTrendy" },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategory(slug);
  const { data } = await supabase
    .from("articles")
    .select("id,title,slug,excerpt,cover_image_url,category,published_at")
    .eq("status", "published")
    .in("category", category.articleCategories)
    .order("published_at", { ascending: false })
    .limit(50);

  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="page-head">
        <div className="eyebrow">IGTRENDY · CATEGORY</div>
        <h1>{category.title}</h1>
        <p>{category.description}</p>
        <p>{category.intro}</p>
        <nav aria-label="Related categories" className="category-strip">
          {category.related.map(([href, label]) => <Link href={\`/category/\${href}\`} key={href}>{label}</Link>)}
        </nav>
      </section>
      <section className="content-section">
        <div className="section-title"><div><div className="eyebrow">LATEST COVERAGE</div><h2>{category.title}</h2></div></div>
        <div className="article-list">
          {(data ?? []).map((a: any) => (
            <Link className="article-row" href={\`/article/\${a.slug}\`} key={a.id}>
              {a.cover_image_url ? <img src={a.cover_image_url} alt="" loading="lazy" /> : <div className="row-placeholder">✦</div>}
              <div><h2>{a.title}</h2><p>{a.excerpt}</p><small>{a.published_at ? new Date(a.published_at).toLocaleDateString("en-US") : ""} · {a.category}</small></div>
            </Link>
          ))}
        </div>
        {!(data?.length) && <div className="empty-state"><h3>Fresh {category.title.toLowerCase()} coverage is coming.</h3><p>We are building this section around verified, useful stories. Explore related categories while new coverage is prepared.</p></div>}
      </section>
      <footer className="footer"><span>© 2026 IGTrendy</span><div><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/editorial-policy">Editorial Policy</Link><Link href="/corrections">Corrections</Link><Link href="/disclaimer">Disclaimer</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer>
    </main>
  );
}
