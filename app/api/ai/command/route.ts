import { NextResponse } from "next/server";
import { requireAdmin, serviceClient, slugify } from "@/lib/server";

export const maxDuration = 120;

function parseStructuredArticle(raw: unknown) {
  const text = String(raw || '').trim();
  if (!text) throw new Error('Gemini returned an empty response.');
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
    }
    throw new Error('Gemini returned malformed JSON.');
  }
}

function getInteractionText(data: any) {
  if (typeof data?.output_text === 'string') return data.output_text;
  const chunks = (data?.steps || [])
    .filter((step:any) => step?.type === 'model_output')
    .flatMap((step:any) => Array.isArray(step?.content) ? step.content : [])
    .filter((item:any) => item?.type === 'text' && typeof item?.text === 'string')
    .map((item:any) => item.text);
  return chunks.join('\n').trim();
}


async function generateWithOpenRouter(key: string, prompt: string) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
      'HTTP-Referer': 'https://igtrendy.in',
      'X-Title': 'IGTrendy AI Editorial Engine'
    },
    body: JSON.stringify({
      model: 'openrouter/free',
      messages: [
        {
          role: 'system',
          content: 'You are IGTrendy\'s senior editorial engine. Return only valid JSON matching the supplied schema.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'igtrendy_article',
          strict: true,
          schema: ARTICLE_SCHEMA
        }
      },
      temperature: 0.7
    })
  });

  const raw = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = String(raw?.error?.message || raw?.error?.code || `HTTP ${response.status}`);
    throw new Error(`OpenRouter: ${detail}`);
  }

  const content = raw?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenRouter returned an empty response.');
  }

  return parseStructuredArticle(content);
}

function escapeHtml(value: unknown) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

async function findOpenverseImages(queries: string[], maxImages = 3) {
  const results: any[] = [];
  const uniqueQueries = [...new Set(queries.map((q) => String(q || '').trim()).filter(Boolean))].slice(0, 5);
  for (const query of uniqueQueries) {
    try {
      const url = new URL('https://api.openverse.org/v1/images/');
      url.searchParams.set('q', query);
      url.searchParams.set('page_size', '5');
      const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'IGTrendy/1.0' }, cache: 'no-store' });
      if (!response.ok) continue;
      const data = await response.json().catch(() => null);
      const candidate = (data?.results || []).find((item: any) => item?.url && item?.license && ['cc0','by','by-sa','pdm'].includes(String(item.license).toLowerCase()) && !item?.mature);
      if (candidate) results.push({ ...candidate, query });
      if (results.length >= maxImages) break;
    } catch {}
  }
  return results.slice(0, maxImages);
}

async function storeOpenverseImage(db: any, image: any, slug: string, index: number) {
  if (!image?.url) return null;
  try {
    const response = await fetch(image.url, { headers: { 'User-Agent': 'IGTrendy/1.0' }, cache: 'no-store' });
    if (!response.ok) return null;
    const contentType = String(response.headers.get('content-type') || '').split(';')[0].toLowerCase();
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(contentType)) return null;
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > 8 * 1024 * 1024) return null;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 8 * 1024 * 1024) return null;
    const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : contentType === 'image/gif' ? 'gif' : 'jpg';
    const path = 'articles/' + slug + '/openverse-' + (index + 1) + '.' + extension;
    const upload = await db.storage.from('article-images').upload(path, bytes, { contentType, upsert: true });
    if (upload.error) return null;
    const publicUrl = db.storage.from('article-images').getPublicUrl(path)?.data?.publicUrl || '';
    if (!publicUrl) return null;
    return { url: publicUrl, sourceUrl: image.foreign_landing_url || image.url, title: image.title || 'Image', creator: image.creator || 'Unknown creator', license: image.license || '', licenseVersion: image.license_version || '', licenseUrl: image.license_url || '', query: image.query || '' };
  } catch { return null; }
}

function injectArticleImages(html: string, images: any[]) {
  let output = String(html || '');
  images.forEach((image, index) => {
    const figure = '<figure class="article-media"><a href="' + escapeHtml(image.sourceUrl) + '" target="_blank" rel="noopener noreferrer nofollow"><img src="' + escapeHtml(image.url) + '" alt="' + escapeHtml(image.title) + '" loading="lazy" /></a><figcaption>' + escapeHtml(image.title) + ' — ' + escapeHtml(image.creator) + '. Licensed ' + escapeHtml(image.license.toUpperCase()) + (image.licenseVersion ? ' ' + escapeHtml(image.licenseVersion) : '') + '. <a href="' + escapeHtml(image.sourceUrl) + '" target="_blank" rel="noopener noreferrer nofollow">Image source</a>.</figcaption></figure>';
    const token = new RegExp('<!--\\s*IMAGE_' + (index + 1) + '\\s*-->', 'i');
    output = token.test(output) ? output.replace(token, figure) : output;
  });
  output = output.replace(/<!--\s*IMAGE_\d+\s*-->/gi, '');
  return output;
}

const ARTICLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    slug: { type: 'string' },
    excerpt: { type: 'string' },
    category: { type: 'string', enum: ['Gaming','Movies','Web Series','Events','Theories','Explained','Trending'] },
    tags: { type: 'array', items: { type: 'string' } },
    content_html: { type: 'string' },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { title: { type: 'string' }, url: { type: 'string' } },
        required: ['title','url']
      }
    },
    image_queries: { type: 'array', items: { type: 'string' } },
    story_slides: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { headline: { type: 'string' }, body: { type: 'string' } },
        required: ['headline','body']
      }
    }
  },
  required: ['title','slug','excerpt','category','tags','content_html','sources','image_queries','story_slides']
};

const GEMINI_MODELS = [
  // Keep the fallback chain focused on currently supported Flash/Lite variants.
  // A 429 on one model should immediately move to the next model instead of
  // burning retries against the same exhausted quota.
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash'
];

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const command = String(body.command || "").trim();
    const mode = body.mode === "draft" ? "draft" : "publish";
    if (!command) return NextResponse.json({ error: "Command is required." }, { status: 400 });
    const key = process.env.GEMINI_API_KEY;
    if (!key) return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 503 });

    const db = serviceClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await db.from("ai_usage_daily").select("article_count").eq("usage_date", today).maybeSingle();
    const articleLimit = Number(process.env.DAILY_ARTICLE_LIMIT || 5);
    if ((usage?.article_count || 0) >= articleLimit) return NextResponse.json({ error: `Daily article limit reached (${articleLimit}).` }, { status: 429 });

    const { data: recentArticles } = await db.from("articles").select("id,title,slug,excerpt,category").order("created_at", { ascending:false }).limit(20);
    const prompt = `You are the senior editorial engine for IGTrendy, a global English entertainment, gaming and internet-culture publication.

User command: ${command}

RESEARCH: Use Google Search grounding for current facts, dates, announcements, trailers, release information, cast/creator details and other claims that may have changed. Prefer primary/official sources first, then reputable journalism. Never invent a fact or URL. Distinguish confirmed information from reports, rumours and speculation.

EDITORIAL STYLE: Write like a polished professional entertainment publication. Use a sharp headline and dek, a compelling factual opening, useful context, clear H2/H3 hierarchy, concise paragraphs, specific dates and names, lists/tables where useful, natural transitions and a useful closing. Make it feel like a real editorial article, not generic AI prose. Do not copy wording or distinctive phrasing from any reference publication.

LINKING: In content_html, naturally link the first meaningful mention of important games, films, shows, studios, platforms, trailers or official announcements when a verified source URL is available. Use real URLs from your grounded research/sources only; never invent URLs. Use normal HTML anchors with target="_blank" rel="noopener noreferrer nofollow". Do not turn every word into a link. Aim for 3-8 useful inline links when appropriate.

IMAGES: Insert exactly 2-3 placeholder comments at natural points: <!-- IMAGE_1 -->, <!-- IMAGE_2 -->, <!-- IMAGE_3 -->. Do not put them inside another HTML tag. Also return image_queries: 2-3 concise searches for visually relevant, openly-licensed images. Prefer useful concepts rather than copyrighted posters or screenshots. The server will search an openly-licensed image library and add attribution automatically.

ARTICLE: Write roughly 1600-2400 words when the topic supports it. Avoid padding and repetition. Use semantic HTML: h2, h3, p, ul, ol, li, blockquote, strong, em, table, thead, tbody, tr, th, td, a. Do not include h1 because the site renders the article title separately. Release-date/list articles should be easy to scan; news/explainers/theories should have a coherent narrative.

SOURCES: Return 5-12 high-quality sources with title and URL. Prefer official studio/developer/network/platform pages for primary facts and reputable publications for reporting/context.

WEB STORY: Create 6-10 concise slides from the article, each with a punchy headline and useful body text.

Return ONLY valid JSON with keys: title, slug, excerpt, category, tags, content_html, sources, image_queries, story_slides.

Existing articles that may be updated: ${JSON.stringify(recentArticles || [])}. If the command asks to update an existing article, return the revised complete article using the same slug when possible.

Command to execute: ${command}`;

    const configuredModel = process.env.GEMINI_MODEL || '';
    // Prefer Lite first for the automated publishing workflow. If an older
    // env var still points at a standard Flash model, it remains in the chain
    // but no longer blocks the Lite fallback.
    const fallbackModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      configuredModel,
      ...GEMINI_MODELS
    ].filter((v,i,a)=>v && a.indexOf(v)===i);

    let article:any = null;
    let lastError = 'AI article generation failed.';

    // Provider 1: Gemini with Google Search grounding.
    for (const model of fallbackModels) {
      if (article) break;
      try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
          method: 'POST',
          headers: {'Content-Type':'application/json','x-goog-api-key':key},
          body: JSON.stringify({
            model,
            input: prompt,
            tools: [{ type: 'google_search' }],
            response_format: { type: 'text', mime_type: 'application/json', schema: ARTICLE_SCHEMA },
            generation_config: { max_output_tokens: 12000, thinking_level: 'low' }
          })
        });

        const raw = await response.json().catch(()=>null);
        if (!response.ok) {
          const detail = String(raw?.error?.message || raw?.error?.code || `HTTP ${response.status}`);
          lastError = `${model}: ${detail}`;
          continue;
        }

        if (raw?.status && raw.status !== 'completed') {
          lastError = `${model}: interaction status ${raw.status}.`;
          continue;
        }

        try {
          article = parseStructuredArticle(getInteractionText(raw));
        } catch (parseError:any) {
          lastError = `${model}: ${parseError?.message || 'Malformed structured output.'}`;
        }
      } catch (networkError:any) {
        lastError = `${model}: ${networkError?.message || 'Network request failed.'}`;
      }
    }

    // Provider 2: OpenRouter's current free-model router. This deliberately
    // uses a provider-specific request because Gemini's Google Search tool is
    // not portable to OpenRouter models.
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!article && openRouterKey) {
      try {
        article = await generateWithOpenRouter(openRouterKey, prompt);
      } catch (openRouterError:any) {
        lastError = openRouterError?.message || 'OpenRouter generation failed.';
      }
    }

    if (!article) {
      throw new Error(
        `AI article generation failed after Gemini and OpenRouter fallbacks. ${lastError}`
      );
    }
    article.slug = slugify(article.slug || article.title);

    const imageCandidates = await findOpenverseImages(Array.isArray(article.image_queries) ? article.image_queries : [article.title], 3);
    const storedImages:any[] = [];
    for (let i = 0; i < imageCandidates.length; i++) {
      const stored = await storeOpenverseImage(db, imageCandidates[i], article.slug, i);
      if (stored) storedImages.push(stored);
    }
    article.content_html = injectArticleImages(article.content_html, storedImages);
    const imageUrl = storedImages[0]?.url || "";

    const status = mode === "publish" ? "published" : "draft";
    const { data: existing } = await db.from("articles").select("id,cover_image_url").eq("slug", article.slug).maybeSingle();
    const payload = { title: article.title, slug: article.slug, excerpt: article.excerpt, content_html: article.content_html, cover_image_url: existing?.cover_image_url || imageUrl || null, category: article.category, tags: article.tags || [], status, updated_at: new Date().toISOString(), published_at: status === "published" ? new Date().toISOString() : null };
    const query = existing ? db.from("articles").update(payload).eq("id", existing.id) : db.from("articles").insert(payload);
    const { data: saved, error } = await query.select("id,title,slug,status,cover_image_url").single();
    if (error) {
      const detail = [error.message, (error as any).hint, (error as any).details].filter(Boolean).join(' | ');
      throw new Error(`Article save failed: ${detail}`);
    }
    await db.rpc("record_ai_usage", { p_kind: "article" });
    const warnings:string[] = [];
    if (Array.isArray(article.image_queries) && storedImages.length < Math.min(3, article.image_queries.length)) warnings.push("Some requested images could not be sourced from the openly-licensed image library.");
    if (Array.isArray(article.sources) && saved?.id) {
      const sourceRows = article.sources.filter((s:any)=>s?.url).slice(0,12).map((s:any)=>({article_id:saved.id,title:s.title||s.url,url:s.url}));
      const sourceDelete = await db.from("article_sources").delete().eq("article_id", saved.id);
      if (sourceDelete.error) warnings.push(`Sources cleanup: ${sourceDelete.error.message}`);
      if (sourceRows.length) { const sourceInsert = await db.from("article_sources").insert(sourceRows); if (sourceInsert.error) warnings.push(`Sources save: ${sourceInsert.error.message}`); }
    }
    if (saved?.id && Array.isArray(article.story_slides) && article.story_slides.length) {
      const { data: existingStory } = await db.from("web_stories").select("id").eq("article_id", saved.id).maybeSingle();
      const storyPayload = { article_id:saved.id, title:article.title, slides:article.story_slides, status, published_at:status === "published" ? new Date().toISOString() : null };
      const story = existingStory
        ? await db.from("web_stories").update(storyPayload).eq("id", existingStory.id)
        : await db.from("web_stories").insert(storyPayload);
      if (story.error) warnings.push(`Web Story save: ${story.error.message}`);
    }
    if (body.sourceTrendId) {
      const trendUpdate = await db.from('trend_queue').update({status}).eq('id', String(body.sourceTrendId));
      if (trendUpdate.error) warnings.push(`Trend update: ${trendUpdate.error.message}`);
    }
    const message = status === "published" ? (existing ? "Article updated and published." : "Article published.") : (existing ? "Article updated as draft." : "Article saved as draft.");
    return NextResponse.json({ ok:true, article:saved, warnings, message });
  } catch (e:any) { return NextResponse.json({ error:e.message||"Command failed." }, {status: e.message?.includes("Admin") ? 403 : 500}); }
}
