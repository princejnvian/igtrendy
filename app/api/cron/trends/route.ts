import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/server";

export const maxDuration = 300;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const base = new URL(request.url);
    const secret = process.env.CRON_SECRET || "";
    const db = serviceClient();

    // Refresh the trend queue once per day. Cron is allowed to bypass the
    // manual scanner's daily limit because this is the dedicated scheduled run.
    const scanResponse = await fetch(`${base.origin}/api/admin/trends?source=cron`, {
      headers: { "x-cron-secret": secret },
      cache: "no-store"
    });
    const scanData = await scanResponse.json().catch(() => null);

    // Never let a failed scan prevent publishing from already-queued trends.
    const { data: usage } = await db
      .from("ai_usage_daily")
      .select("article_count")
      .eq("usage_date", new Date().toISOString().slice(0, 10))
      .maybeSingle();
    const dailyLimit = Number(process.env.DAILY_ARTICLE_LIMIT || 5);
    const remaining = Math.max(0, dailyLimit - Number(usage?.article_count || 0));
    if (!remaining) {
      return NextResponse.json({ ok: true, published: 0, message: "Daily article limit already reached.", scan: scanData });
    }

    const { data: trends, error: trendError } = await db
      .from("trend_queue")
      .select("id,topic,category,why_now,trend_score,source_urls,status,scanned_at")
      .eq("status", "queued")
      .order("trend_score", { ascending: false })
      .order("scanned_at", { ascending: false })
      .limit(Math.min(10, remaining));
    if (trendError) throw new Error(`Auto-publish queue read failed: ${trendError.message}`);

    const selected = (trends || []).slice(0, remaining);
    if (!selected.length) {
      return NextResponse.json({ ok: true, published: 0, message: "No queued trends available after today's scan.", scan: scanData });
    }

    // Generate in parallel so five articles do not consume five sequential
    // model timeouts. Each child request still has its own 300s function limit.
    const results = await Promise.allSettled(selected.map(async (trend: any) => {
      const command = `Automatically publish today's IGTrendy article about: ${trend.topic}\n\nCategory: ${trend.category}\nWhy now: ${trend.why_now}\nSource URLs from the trend scanner: ${JSON.stringify(trend.source_urls || [])}\n\nUse these URLs as starting points, verify current facts with live web research, write the complete article, source list and web story, and publish it. Do not mention this automation in the article.`;
      const response = await fetch(`${base.origin}/api/ai/command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": secret
        },
        body: JSON.stringify({ command, mode: "publish", sourceTrendId: trend.id }),
        cache: "no-store"
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(data?.error || `Article generation failed (${response.status}).`));
      return { trendId: trend.id, topic: trend.topic, article: data?.article || null, message: data?.message || "Published" };
    }));

    const published = results.filter((r) => r.status === "fulfilled").map((r: any) => r.value);
    const failed = results.filter((r) => r.status === "rejected").map((r: any, index) => ({
      trendId: selected[index]?.id,
      topic: selected[index]?.topic,
      error: r.reason?.message || "Unknown error"
    }));

    return NextResponse.json({
      ok: failed.length === 0,
      published: published.length,
      failed: failed.length,
      results: published,
      errors: failed,
      scan: scanData
    }, { status: failed.length && !published.length ? 500 : 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Automatic publishing failed." }, { status: 500 });
  }
}
