import Link from "next/link";
import YoutentLogo from "@/components/YoutentLogo";
import type { ReactNode } from "react";

type Props = {
  accountType?: "client" | "freelancer";
  active?: "dashboard" | "creators" | "requests" | "messages" | "profile";
};

const categories = [
  ["Graphics & Design", "Graphics & Design"],
  ["Programming & Tech", "Programming & Tech"],
  ["Video & Animation", "Video & Animation"],
  ["Writing & Translation", "Writing & Translation"],
  ["Music & Audio", "Music & Audio"],
  ["Marketing", "Digital Marketing"],
  ["AI Services", "AI Services"],
  ["Business", "Business"],
];

function Icon({ children }: { children: ReactNode }) {
  return <span className="marketplace-icon" aria-hidden="true">{children}</span>;
}

export default function MarketplaceNav({ accountType = "client", active }: Props) {
  const requestHref = accountType === "freelancer" ? "/requests" : "/my-requests";
  const requestLabel = accountType === "freelancer" ? "Requests" : "My Requests";

  return (
    <header className="marketplace-header">
      <div className="marketplace-header-main">
        <Link href="/dashboard" className="marketplace-brand" aria-label="YOUTENT Dashboard">
          <YoutentLogo className="h-10 w-10 shrink-0" priority />
          <span className="youtent-mobile-wordmark text-[18px] font-black tracking-[-0.045em] sm:text-[21px]">YOUTENT<span className="marketplace-brand-dot">.</span></span>
        </Link>

        <form action="/creators" className="marketplace-search">
          <Icon>⌕</Icon>
          <input name="q" placeholder="What service are you looking for today?" aria-label="Search creators or services" />
          <button type="submit">Search</button>
        </form>

        <nav className="marketplace-actions" aria-label="Marketplace navigation">
          <Link className={active === "creators" ? "active" : ""} href="/creators">Browse Creators</Link>
          <Link className="icon-action" href={requestHref} aria-label={requestLabel}><Icon>♧</Icon><span className="action-label">{requestLabel}</span></Link>
          <Link className={active === "messages" ? "icon-action active" : "icon-action"} href="/dashboard/messages" aria-label="Messages"><Icon>✉</Icon></Link>
          <Link className={active === "profile" ? "active profile-action" : "profile-action"} href="/profile">My Profile</Link>
          <form action="/auth/signout" method="post">
            <button className="logout-action" type="submit">Log out</button>
          </form>
        </nav>
      </div>

      <div className="marketplace-category-bar">
        <Link href="/creators" className="trending-link">Trending <span>✦</span></Link>
        {categories.map(([label, q]) => (
          <Link key={label} href={`/creators?q=${encodeURIComponent(q)}`}>{label}</Link>
        ))}
        <Link href="/creators?q=Photography">Photography</Link>
      </div>

      <div className="marketplace-mobile-search">
        <form action="/creators">
          <Icon>⌕</Icon>
          <input name="q" placeholder="Search creators or services" />
          <button type="submit">Search</button>
        </form>
      </div>
    </header>
  );
}
