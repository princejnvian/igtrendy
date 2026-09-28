import { NextResponse } from "next/server";
import { requireAdmin, serviceClient, slugify } from "@/lib/server";

export const maxDuration = 120;

function extractJson(text: string) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("AI returned an invalid content object.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function modelList() {
  // Start with lighter/stable models so a busy flagship model does not block publishing.
  // GEMINI_MODEL can still be used, but it is treated as a preference rather than the only model.
  const configured = process.env.GEMINI_MODEL?.trim();
  return [
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    configured,
  ].filter((v, i, a): v is string => Boolean(v) && a.indexOf(v) === i);
}

async function generateArticle(key: string, prompt: string) {
  let lastError = "Gemini article generation failed.";

  for (const model of modelList()) {
    // Official guidance recommends exponential backoff for transient 429/5xx errors.
    // We keep retries short, then immediately move to another model.
    for (let retry = 0; retry < 2; retry++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": key,
            },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.25,
                responseMimeType: "application/json",
              },
            }),
          },
        );

        if (response.ok) {
          const data = await response.json();
          const text =
            data.candidates?.[0]?.content?.parts
              ?.map((part: any) => part.text || "")
              .join("") || "";
          if (!text) {
            lastError = `${model} returned an empty response.`;
            break;
          }
          return { model, article: extractJson(text) };
        }

        let detail = `HTTP ${response.status}`;
        try {
          const errorBody = await response.json();
          detail = String(errorBody?.error?.message || detail);
        } catch {
          // Keep the HTTP status when the API did not return JSON.
        }
        lastError = `${model}: ${detail}`;

        // 429/408/5xx are transient according to Google's API guidance.
        // 400/401/403 etc. move directly to the next model because retrying
        // the same request will not fix an invalid request/key/permission issue.
        const transient =
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500;

        if (!transient) break;
        if (retry === 0) await sleep(1200);
      } catch (error: any) {
        lastError = `${model}: ${error?.message || "Network error"}`;
        if (retry === 0) await sleep(1200);
      }
    }
  }

  throw new Error(
    `Gemini article generation failed on all fallback models. Last error: ${lastError}`,
  );
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const command = String(body.command || "").trim();
    const mode = body.mode === "draft" ? "draft" : "publish";

    if (!command) {
      return NextResponse.json({ error: "Command is required." }, { status: 400 });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 503 },
      );
    }

    const db = serviceClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await db
      .from("ai_usage_daily")
      .select("article_count,image_count")
      .eq("usage_date", today)
      .maybeSingle();

    const articleLimit = Number(process.env.DAILY_ARTICLE_LIMIT || 5);
    const imageLimit = Number(process.env.DAILY_IMAGE_LIMIT || 5);

    if ((usage?.article_count || 0) >= articleLimit) {
      return NextResponse.json(
        { error: `Daily article limit reached (${articleLimit}).` },
        { status: 429 },
      );
    }

    const { data: recentArticles } = await db
      .from("articles")
      .select("id,title,slug,excerpt,category")
      .order("created_at", { ascending: false })
      .limit(20);

    const prompt = `You are the editorial engine for IGTrendy, a global entertainment and gaming publication.

User command: ${command}

Research using the supplied source URLs as leads and your current knowledge. Prefer official sources and reputable reporting. Do not invent facts. Return ONLY valid JSON with keys: title, slug, excerpt, category, tags (array), content_html, sources (array of {title,url}), image_prompt, story_slides (array of {headline,body}). Content must be original, useful, factual, and not copied. Use category exactly one of: Gaming, Movies, Web Series, Events, Theories, Explained, Trending. Write clean semantic HTML inside content_html using h2, h3, p, ul, li, blockquote only. Mention uncertainty where facts are unconfirmed. Avoid defamatory or unsupported claims. Existing articles that may be updated: ${JSON.stringify(recentArticles || [])}. If the command asks to update an existing article, return the revised complete article using the same slug when possible.

Source leads included in the command (verify before relying on them): ${command}`;

    const generated = await generateArticle(key, prompt);
    const article = generated.article;
    article.slug = slugify(article.slug || article.title);

    let imageUrl = "";
    const canGenerateImage =
      body.generateImage !== false && (usage?.image_count || 0) < imageLimit;

    if (canGenerateImage) {
      try {
        const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
        const img = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/interactions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": key,
            },
            body: JSON.stringify({
              model: imageModel,
              input: String(article.image_prompt || article.title).slice(0, 3000),
              response_format: {
                type: "image",
                aspect_ratio: "16:9",
                image_size: "1K",
              },
            }),
          },
        );

        if (img.ok) {
          const data = await img.json();
          const b64 =
            data.output_image?.data ||
            data.output?.find((x: any) => x?.type === "image")?.data;

          if (b64) {
            const bytes = Buffer.from(b64, "base64");
            const path = `ai-generated/${crypto.randomUUID()}.png`;
            const up = await db.storage
              .from("prompt-images")
              .upload(path, bytes, {
                contentType: "image/png",
                upsert: false,
              });

            if (!up.error) {
              imageUrl = db.storage.from("prompt-images").getPublicUrl(path)
                .data.publicUrl;
              await db.rpc("record_ai_usage", { p_kind: "image" });
            }
          }
        }
      } catch {
        // Article generation/publishing must continue even if image generation is busy.
      }
    }

    const status = mode === "publish" ? "published" : "draft";
    const { data: existing } = await db
      .from("articles")
      .select("id")
      .eq("slug", article.slug)
      .maybeSingle();

    const payload = {
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content_html: article.content_html,
      cover_image_url: imageUrl || null,
      category: article.category,
      tags: article.tags || [],
      status,
      updated_at: new Date().toISOString(),
      published_at: status === "published" ? new Date().toISOString() : null,
    };

    const query = existing
      ? db.from("articles").update(payload).eq("id", existing.id)
      : db.from("articles").insert(payload);

    const { data: saved, error } = await query
      .select("id,title,slug,status,cover_image_url")
      .single();

    if (error) throw new Error(error.message);

    // Count only after the article has actually been saved.
    await db.rpc("record_ai_usage", { p_kind: "article" });

    if (Array.isArray(article.sources) && saved?.id) {
      await db.from("article_sources").delete().eq("article_id", saved.id);
      await db.from("article_sources").insert(
        article.sources
          .filter((s: any) => s?.url)
          .slice(0, 12)
          .map((s: any) => ({
            article_id: saved.id,
            title: s.title || s.url,
            url: s.url,
          })),
      );
    }

    if (saved?.id && Array.isArray(article.story_slides) && article.story_slides.length) {
      await db.from("web_stories").insert({
        article_id: saved.id,
        title: article.title,
        slides: article.story_slides,
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
      });
    }

    return NextResponse.json({
      ok: true,
      model: generated.model,
      article: saved,
      message:
        status === "published"
          ? existing
            ? "Article updated and published."
            : "Article published."
          : existing
            ? "Article updated as draft."
            : "Article saved as draft.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Command failed." },
      { status: e.message?.includes("Admin") ? 403 : 500 },
    );
  }
}
