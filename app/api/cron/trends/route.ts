import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET || "";
  return !!secret && (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.headers.get("x-cron-secret") === secret
  );
}

const TITLE_STOP_WORDS = new Set(["about","after","again","amid","among","and","are","around","before","being","best","between","breaking","but","could","does","down","during","from","have","here","how","into","just","latest","more","most","new","news","over","says","that","their","them","then","there","these","this","those","through","today","tomorrow","update","updates","using","what","when","where","which","while","with","will","your"]);

function topicTokens(value: string) {
  return new Set(value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length >= 3 && !TITLE_STOP_WORDS.has(word)));
}

function similar(a: string, b: string) {
  const aa = topicTokens(a);
  const bb = topicTokens(b);
  if (!aa.size || !bb.size) return false;
  let overlap = 0;
  for (const word of aa) if (bb.has(word)) overlap++;
  const containment = overlap / Math.min(aa.size, bb.size);
  const jaccard = overlap / Math.max(1, aa.size + bb.size - overlap);
  return overlap >= 3 && containment >= 0.7 && (jaccard >= 0.38 || overlap >= 5);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const base = new URL(request.url);
  const secret = process.env.CRON_SECRET || "";
  const db = serviceClient();

  try {
    const scanResponse = await fetch(`${base.origin}/api/admin/trends?source=cron`, {
      headers: { "x-cron-secret": secret },
      cache: "no-store",
    });
    const scanData = await scanResponse.json().catch(() => null);

    if (!scanResponse.ok || scanData?.error) {
      throw new Error(`Trend scan failed (HTTP ${scanResponse.status}): ${scanData?.error || "No error details returned."}`);
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: usage, error: usageError } = await db
      .from("ai_usage_daily")
      .select("article_count")
      .eq("usage_date", today)
      .maybeSingle();
    if (usageError) throw new Error(`Daily usage lookup failed: ${usageError.message}`);

    const configuredLimit = Number(process.env.DAILY_ARTICLE_LIMIT || 5);
    const dailyLimit = Math.min(5, Math.max(1, configuredLimit));
    const remaining = Math.max(0, dailyLimit - Number(usage?.article_count || 0));
    if (!remaining) {
      return NextResponse.json({
        ok: true,
        published: 0,
        message: `Daily article limit reached (${dailyLimit}).`,
        scan: scanData,
      });
    }

    // Load a larger candidate pool so a failed topic does not prevent the daily target.
    const runStartedAt = Date.now();
    const runBudgetMs = 250_000; // Stay inside the route's 300-second execution budget.
    const maxAttemptsPerTopic = 2;
    const freshSince = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: trends, error: queueError } = await db
      .from("trend_queue")
      .select("id,topic,slug,category,why_now,trend_score,source_urls,status,scanned_at")
      .eq("status", "queued")
      .gte("scanned_at", freshSince)
      .order("trend_score", { ascending: false })
      .limit(30);
    if (queueError) throw new Error(`Auto-publish queue read failed: ${queueError.message}`);

    const { data: recentArticles, error: articlesError } = await db
      .from("articles")
      .select("title,slug")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1000);
    if (articlesError) throw new Error(`Recent article lookup failed: ${articlesError.message}`);

    const { data: publishedTrends, error: publishedError } = await db
      .from("trend_queue")
      .select("source_urls,topic")
      .eq("status", "published")
      .limit(2000);
    if (publishedError) throw new Error(`Published trend lookup failed: ${publishedError.message}`);

    const publishedSources = new Set((publishedTrends || []).flatMap((row: any) =>
      Array.isArray(row.source_urls) ? row.source_urls : []
    ));
    const usedTitles = [
      ...(recentArticles || []).map((row: any) => row.title),
      ...(publishedTrends || []).map((row: any) => row.topic),
    ];
    const selected: any[] = [];
    for (const trend of trends || []) {
      const sources = Array.isArray(trend.source_urls) ? trend.source_urls : [];
      if (sources.some((url: string) => publishedSources.has(url))) continue;
      if (usedTitles.some((title: string) => similar(title, trend.topic))) continue;
      if (selected.some((item: any) => similar(item.topic, trend.topic))) continue;
      selected.push(trend);
      if (selected.length >= Math.min(30, Math.max(10, remaining * 4))) break;
    }

    if (!selected.length) {
      return NextResponse.json({
        ok: true,
        published: 0,
        target: remaining,
        message: "No fresh, non-duplicate queued trends were available. See scan details.",
        scan: scanData,
        queuedFreshCandidates: trends?.length || 0,
      });
    }

    const published: any[] = [];
    const failed: any[] = [];
    const retryable = (message: string) =>
      /429|rate.?limit|timeout|timed out|temporar|overload|5\d\d|fetch failed|network|503|502|504|empty response|no usable output/i.test(message);

    for (const trend of selected) {
      if (published.length >= remaining) break;
      if (Date.now() - runStartedAt > runBudgetMs) {
        failed.push({ topic: trend.topic, trendId: trend.id, error: "Run time budget reached; remaining trends stay queued." });
        break;
      }

      const { error: processingError } = await db
        .from("trend_queue")
        .update({ status: "processing" })
        .eq("id", trend.id)
        .eq("status", "queued");
      if (processingError) {
        failed.push({ topic: trend.topic, trendId: trend.id, error: `Could not mark trend as processing: ${processingError.message}` });
        continue;
      }

      const command = `Automatically publish one original IGTrendy article about: ${trend.topic}

Category: ${trend.category}
Why now / source context: ${trend.why_now}
Source URLs from the fresh scanner: ${JSON.stringify(trend.source_urls || [])}

Verify current facts with live web research when available. If this is News, report what is confirmed, who reported it, when it happened, and what remains unverified. Do not invent facts. Publish the article even if no image can be sourced; images are optional. Do not mention this automation.`;

      let success: any = null;
      let lastError = "Article generation failed.";
      for (let attempt = 1; attempt <= maxAttemptsPerTopic; attempt++) {
        if (Date.now() - runStartedAt > runBudgetMs) {
          lastError = "Run time budget reached; will retry on the next scheduled run.";
          break;
        }
        try {
          const controller = new AbortController();
          const timeoutMs = Math.min(70_000, Math.max(10_000, runBudgetMs - (Date.now() - runStartedAt)));
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          let response: Response;
          let data: any;
          try {
            response = await fetch(`${base.origin}/api/ai/command`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-cron-secret": secret },
              body: JSON.stringify({ command, mode: "publish", sourceTrendId: trend.id }),
              cache: "no-store",
              signal: controller.signal,
            });
            data = await response.json().catch(() => null);
          } finally {
            clearTimeout(timer);
          }
          if (response.ok && data?.ok && data?.article?.id) {
            success = { trendId: trend.id, topic: trend.topic, article: data.article, attempts: attempt };
            break;
          }
          lastError = String(data?.error || data?.message || `Article generation/save failed (HTTP ${response.status}).`);
        } catch (error: any) {
          lastError = error?.name === "AbortError"
            ? "Article generation request timed out."
            : (error?.message || "Article generation request failed.");
        }

        if (attempt >= maxAttemptsPerTopic || !retryable(lastError)) break;
      }

      if (success) {
        published.push(success);
        // Refresh duplicate guards so later topics in this run cannot publish similar headlines.
        usedTitles.push(String(success.article?.title || trend.topic));
        const { error: markPublishedError } = await db
          .from("trend_queue")
          .update({ status: "published" })
          .eq("id", trend.id);
        if (markPublishedError) console.error("Could not mark published trend:", markPublishedError.message);
      } else {
        // Never leave a failed item stuck in processing. It can be retried by a later cron run.
        const { error: resetError } = await db
          .from("trend_queue")
          .update({ status: "queued" })
          .eq("id", trend.id);
        if (resetError) console.error("Failed to reset unsuccessful trend to queued:", resetError.message);
        failed.push({ trendId: trend.id, topic: trend.topic, attempts: maxAttemptsPerTopic, error: lastError });
      }
    }

    const reachedTarget = published.length >= remaining;
    return NextResponse.json({
      ok: reachedTarget && failed.length === 0,
      published: published.length,
      target: remaining,
      targetReached: reachedTarget,
      failed: failed.length,
      results: published,
      errors: failed,
      remainingRunBudgetMs: Math.max(0, runBudgetMs - (Date.now() - runStartedAt)),
      message: reachedTarget
        ? "Daily publication target reached."
        : `Published ${published.length} of ${remaining} remaining target articles; queued failures can be retried on the next scheduled run.`,
      scan: scanData,
    }, { status: reachedTarget && failed.length === 0 ? 200 : 500 });
  } catch (error: any) {
    console.error("IGTrendy scheduled auto-publish failed:", error?.message || error);
    return NextResponse.json({
      ok: false,
      error: error?.message || "Automatic publishing failed.",
    }, { status: 500 });
  }
}
