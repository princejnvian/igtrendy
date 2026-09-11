import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://igtrendy.in"),
  title: {
    default: "IGTrendy — Viral AI Prompts & AI Image Ideas",
    template: "%s | IGTrendy",
  },
  description:
    "Discover viral AI image prompts, 80s retro photo prompts, cinematic portraits, Instagram styles and more. Copy prompts and create your own images on IGTrendy.",
  keywords: [
    "AI prompts",
    "AI image prompts",
    "viral AI prompts",
    "AI photo prompts",
    "AI portrait prompts",
    "80s retro AI photo prompt",
    "Instagram AI prompts",
    "cinematic AI prompts",
    "AI image ideas",
    "IGTrendy",
  ],
  alternates: {
    canonical: "https://igtrendy.in",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "https://igtrendy.in",
    siteName: "IGTrendy",
    title: "IGTrendy — Viral AI Prompts & AI Image Ideas",
    description:
      "Discover viral AI image prompts, copy prompts and create your own AI images.",
  },
  twitter: {
    card: "summary_large_image",
    title: "IGTrendy — Viral AI Prompts & AI Image Ideas",
    description:
      "Discover viral AI image prompts, copy prompts and create your own AI images.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
