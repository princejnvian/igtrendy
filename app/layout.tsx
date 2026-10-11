import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://igtrendy.in"),
  title: { default: "IGTrendy — What's Trending Now", template: "%s | IGTrendy" },
  description: "Trending sports, cricket and IPL, football, Indian and global stock markets, crypto, gaming, Bollywood, Hollywood, movies, web series and explainers.",
  alternates: { canonical: "https://igtrendy.in" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: { type: "website", siteName: "IGTrendy", title: "IGTrendy — What's Trending Now", description: "Sports, markets, crypto, gaming, Bollywood, Hollywood, movies, shows and trending news." },
  twitter: { card: "summary_large_image", title: "IGTrendy — What's Trending Now", description: "Games, movies, shows, events, theories and AI prompts." },
  icons: {
    icon: [
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/igtrendy-mark.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon-48x48.png",
    apple: "/favicon-48x48.png",
  },
  themeColor: "#070b14",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
