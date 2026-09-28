import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/server";

export const maxDuration = 120;

type Signal = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
};

function extractJson(text: string) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const starts = [cleaned.indexOf("["), cleaned.indexOf("{")].filter((n) => n >= 0);
  if (!starts.length) throw new Error("Trend scanner returned invalid JSON.");
  const start = Math.min(...starts);
  const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  if (end < start) throw new Error("Trend scanner returned incomplete JSON.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function fetchGoogleNews(query: string) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Google News RSS failed (${response.status}).`);
  const xml = await response.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  return items.slice(0, 8).map((item) => {
    const get = (tag: string) =>
      decodeXml(item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] || "").trim();
    return {
      title: get("title"),
      link: get("link"),
      pubDate: get("pubDate"),
      description: get("description").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    };
  }).filter((x) => x.title && x.link);
}

function inferCategory(signal: Signal) {
  const text = `${signal.title} ${signal.description}`.toLowerCase();
  if (/\b(gta|playstation|xbox|nintendo|gaming|game|steam|switch|fortnite|minecraft|pokemon)\b/.test(text)) return "Gaming";
  if (/\b(netflix|prime video|disney\+|hbo|web series|series|season|episode)\b/.test(text)) return "Web Series";
  if (/\b(movie|film|hollywood|marvel|dc|trailer|casting|box office|actor|actress)\b/.test(text)) return "Movies";
  if (/\b(award|festival|event|concert|premiere|ceremony)\b/.test(text)) return "Events";
  if (/\b(theory|mystery|explained|simulation|conspiracy|ai|artificial intelligence)\b/.test(text)) return "Theories";
  return "Trending";
}

function signalScore(signal: Signal, allSignals: Signal[]) {
  const text = `${signal.title} ${signal.description}`.toLowerCase();
  let score = 50;

  // Freshness is important for a trend scanner.
  const published = Date.parse(signal.pubDate);
  if (Number.isFinite(published)) {
    const hours = Math.max(0, (Date.now() - published) / 36e5);
    if (hours <= 6) score += 25;
    else if (hours <= 24) score += 18;
    else if (hours <= 72) score += 10;
    else if (hours <= 168) score += 4;
  }

  const strongTerms = [
    "announced", "official", "launch", "released", "release date", "trailer",
    "new", "update", "revealed", "confirmed", "premiere", "season", "returns",
    "record", "major", "first look", "gameplay", "coming", "debut"
  ];
  for (const term of strongTerms) if (text.includes(term)) score += 3;

  const weakTerms = ["rumor", "rumour", "leak", "alleged", "possibly", "might"];
  for (const term of weakTerms) if (text.includes(term)) score -= 4;

  // Cross-source repetition is a useful signal of genuine momentum.
  const normalized = signal.title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const keywords = new Set(normalized.filter((w) => w.length >= 5));
  let related = 0;
  for (const other of allSignals) {
    if (other === signal) continue;
    const otherWords = new Set(
      other.title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 5)
    );
    let overlap = 0;
    for (const word of keywords) if (otherWords.has(word)) overlap++;
    if (overlap >= 2) related++;
  }
  score += Math.min(15, related * 4);

  return Math.max(1, Math.min(100, score));
}

function buildLocalTrends(signals: Signal[]) {
  const ranked = [...signals]
    .map((signal) => ({ signal, score: signalScore(signal, signals) }))
    .sort((a, b) => b.score - a.score);

  const selected: Array<{
    title: string;
    category: string;
    why_now: string;
    trend_score: number;
    source_urls: string[];
  }> = [];

  const seenWords: string[][] = [];

  for (const { signal, score } of ranked) {
    const words = signal.title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 5);
    const duplicate = seenWords.some((previous) => {
      const overlap = words.filter((w) => previous.includes(w)).length;
      return overlap >= Math.min(4, Math.max(2, words.length - 1));
    });
    if (duplicate) continue;

    const category = inferCategory(signal);
    const whyNow = signal.pubDate
      ? `Fresh signal from Google News (${new Date(signal.pubDate).toUTCString()}).`
      : "Fresh signal found in Google News.";

    selected.push({
      title: signal.title.replace(/\s+-\s+[^-]+$/, "").trim() || signal.title,
      category,
      why_now: whyNow.slice(0, 210),
      trend_score: score,
      source_urls: [signal.link],
    });
    seenWords.push(words);
    if (selected.length >= 10) break;
  }

  return selected;
}

async function scanTrends(db: any) {

  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await db
    .from("ai_usage_daily")
    .select("trend_scan_count")
    .eq("usage_date", today)
    .maybeSingle();

  const maxScans = Number(process.env.DAILY_TREND_SCAN_LIMIT || 2);
  if ((usage?.trend_scan_count || 0) >= maxScans) {
    throw new Error(`Daily trend scan limit reached (${maxScans}).`);
  }

  // Google News RSS supplies fresh signals without requiring a paid search API.
  const queries = [
    "gaming GTA Nintendo PlayStation Xbox game release update",
    "movies Hollywood Netflix Marvel DC trailer release casting",
    "web series Netflix Prime Video Disney+ HBO trailer release",
    "viral entertainment event awards festival pop culture",
    "internet theory explained technology AI mystery trend",
  ];

  const batches = await Promise.all(queries.map(fetchGoogleNews));
  const signals = batches.flat() as Signal[];
  const unique = Array.from(
    new Map(signals.map((x) => [x.title.toLowerCase(), x])).values()
  ).slice(0, 40);

  if (!unique.length) {
    throw new Error("No fresh Google News signals were found. Try the scan again later.");
  }

  // IMPORTANT: trend scanning is intentionally Gemini-independent.
  // The scanner only discovers and ranks RSS signals. Keeping this path
  // deterministic means temporary Gemini 503/high-demand events can never
  // break the daily/manual trend scan or show a scary AI error to the admin.
  // Gemini is used later, only after the admin chooses a trend for article/image generation.
  const trends = buildLocalTrends(unique);
  const modelUsed = "local-rss-ranker";

  const rows = trends
    .slice(0, 10)
    .filter((t: any) => t?.title)
    .map((t: any) => {
      const topic = String(t.title).trim();
      const slug = topic
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/[\s_-]+/g, "-")
        .slice(0, 90);

      return {
        topic,
        slug,
        category: ["Gaming", "Movies", "Web Series", "Events", "Theories", "Explained", "Trending"].includes(t.category)
          ? t.category
          : "Trending",
        why_now: String(t.why_now || ""),
        trend_score: Math.max(1, Math.min(100, Number(t.trend_score) || 50)),
        source_urls: Array.isArray(t.source_urls)
          ? t.source_urls
              .filter((u: any) => typeof u === "string" && /^https?:\/\//i.test(u))
              .slice(0, 8)
          : [],
        status: "queued",
        scanned_at: new Date().toISOString(),
      };
    });

  if (!rows.length) throw new Error("The trend scanner could not build any queue items.");

  // Write the queue in one operation and NEVER hide a Supabase error.
  // The previous version ignored upsert errors, so the UI could say
  // "10 trends found" even when zero rows were actually saved.
  const { data: insertedRows, error: queueError } = await db
    .from("trend_queue")
    .upsert(rows, { onConflict: "slug" })
    .select("id,topic,slug,category,why_now,trend_score,source_urls,status,created_at,scanned_at");

  if (queueError) {
    throw new Error(`Trend queue save failed: ${queueError.message}`);
  }

  if (!insertedRows?.length) {
    throw new Error("Trend queue save returned no rows. Check the trend_queue table and its RLS/schema.");
  }

  // Count one scan only after the queue has actually been populated.
  const { error: usageError } = await db.rpc("record_ai_usage", { p_kind: "trend_scan" });
  if (usageError) {
    // The queue is already safely saved. Do not turn a successful scan into a
    // false failure just because the optional usage counter is unavailable.
    console.error("AI usage counter update failed:", usageError.message);
  }

  return { count: insertedRows.length, signals: unique.length, model: modelUsed };
}

export async function GET(request: Request) {
  try {
    const auth = request.headers.get("authorization");
    const isCron = Boolean(process.env.CRON_SECRET) && auth === `Bearer ${process.env.CRON_SECRET}`;
    const db = isCron ? serviceClient() : (await requireAdmin(request)).client;
    const result = await scanTrends(db);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Trend scan failed." },
      { status: e.status || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { client: db } = await requireAdmin(request);
    const result = await scanTrends(db);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Trend scan failed." },
      {
        status:
          e.status ||
          (e.message?.includes("Admin") || e.message?.includes("Authentication") ? 403 : 500),
      }
    );
  }
}
