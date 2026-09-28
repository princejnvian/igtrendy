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
    image_prompt: { type: 'string' },
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
  required: ['title','slug','excerpt','category','tags','content_html','sources','image_prompt','story_slides']
};

const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash'
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
    const { data: usage } = await db.from("ai_usage_daily").select("article_count,image_count").eq("usage_date", today).maybeSingle();
    const articleLimit = Number(process.env.DAILY_ARTICLE_LIMIT || 5);
    const imageLimit = Number(process.env.DAILY_IMAGE_LIMIT || 5);
    if ((usage?.article_count || 0) >= articleLimit) return NextResponse.json({ error: `Daily article limit reached (${articleLimit}).` }, { status: 429 });

    const { data: recentArticles } = await db.from("articles").select("id,title,slug,excerpt,category").order("created_at", { ascending:false }).limit(20);
    const prompt = `You are the editorial engine for IGTrendy, a global entertainment and gaming publication.\n\nUser command: ${command}\n\nResearch using the supplied source URLs as leads and your current knowledge. Prefer official sources and reputable reporting. Do not invent facts. Return ONLY valid JSON with keys: title, slug, excerpt, category, tags (array), content_html, sources (array of {title,url}), image_prompt, story_slides (array of {headline,body}). Content must be original, useful, factual, and not copied. Use category exactly one of: Gaming, Movies, Web Series, Events, Theories, Explained, Trending. Write clean semantic HTML inside content_html using h2, h3, p, ul, li, blockquote only. Mention uncertainty where facts are unconfirmed. Avoid defamatory or unsupported claims. Existing articles that may be updated: ${JSON.stringify(recentArticles || [])}. If the command asks to update an existing article, return the revised complete article using the same slug when possible.\n\nSource leads included in the command (verify before relying on them): ${command}`;

    const configuredModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const fallbackModels = [configuredModel, ...GEMINI_MODELS].filter((v,i,a)=>v && a.indexOf(v)===i && GEMINI_MODELS.includes(v));

    let article:any = null;
    let lastError = 'Gemini article generation failed.';

    for (const model of fallbackModels) {
      if (article) break;
      for (let retry=0; retry<2 && !article; retry++) {
        try {
          const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
            method: 'POST',
            headers: {'Content-Type':'application/json','x-goog-api-key':key},
            body: JSON.stringify({
              model,
              input: prompt,
              response_format: { type: 'text', mime_type: 'application/json', schema: ARTICLE_SCHEMA },
              generation_config: { max_output_tokens: 12000, thinking_level: 'low' }
            })
          });

          const raw = await response.json().catch(()=>null);
          if (!response.ok) {
            const detail = String(raw?.error?.message || raw?.error?.code || `HTTP ${response.status}`);
            lastError = `${model}: ${detail}`;
            if ([408,429,500,502,503,504].includes(response.status) && retry < 1) {
              await new Promise(r=>setTimeout(r,1000*(2**retry)));
              continue;
            }
            break;
          }

          if (raw?.status && raw.status !== 'completed') {
            lastError = `${model}: interaction status ${raw.status}.`;
            break;
          }

          const outputText = getInteractionText(raw);
          try {
            article = parseStructuredArticle(outputText);
          } catch (parseError:any) {
            lastError = `${model}: ${parseError?.message || 'Malformed structured output.'}`;
            break;
          }
        } catch (networkError:any) {
          lastError = `${model}: ${networkError?.message || 'Network request failed.'}`;
          if (retry < 1) {
            await new Promise(r=>setTimeout(r,1500));
            continue;
          }
        }
      }
    }

    if (!article) throw new Error(`Gemini article generation failed. ${lastError}`);
    article.slug = slugify(article.slug || article.title);

    let imageUrl = "";
    let imageWarning = "";
    const canGenerateImage = body.generateImage !== false && (usage?.image_count || 0) < imageLimit;
    if (body.generateImage !== false && !canGenerateImage) imageWarning = `Image limit reached (${imageLimit}/day).`;
    if (canGenerateImage) {
      try {
        const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
        const img = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
          method:"POST",
          headers:{"Content-Type":"application/json","x-goog-api-key":key},
          body:JSON.stringify({
            model:imageModel,
            input:String(article.image_prompt || article.title).slice(0,3000),
            response_format:{type:"image",mime_type:"image/jpeg",aspect_ratio:"16:9",image_size:"1K"}
          })
        });
        if (img.ok) {
          const data=await img.json();
          const b64 = data.output_image?.data
            || data.steps?.flatMap((step:any)=>Array.isArray(step?.content)?step.content:[])?.find((x:any)=>x?.type==="image")?.data
            || data.output?.find((x:any)=>x?.type==="image")?.data;
          if (b64) {
            const bytes=Buffer.from(b64,"base64");
            const path=`ai-generated/${crypto.randomUUID()}.jpg`;
            const up=await db.storage.from("article-images").upload(path,bytes,{contentType:"image/jpeg",upsert:false});
            if(!up.error){
              imageUrl=db.storage.from("article-images").getPublicUrl(path).data.publicUrl;
              await db.rpc("record_ai_usage", {p_kind:"image"});
            } else {
              imageWarning = `Image upload failed: ${up.error.message}`;
            }
          } else {
            imageWarning = "Gemini returned no image data.";
          }
        } else {
          const detail = await img.text().catch(()=>"");
          imageWarning = `Image generation failed (${img.status})${detail ? `: ${detail.slice(0,240)}` : "."}`;
        }
      } catch (imageError:any) {
        imageWarning = `Image generation failed: ${imageError?.message || "Unknown image error."}`;
      }
    }

    const status = mode === "publish" ? "published" : "draft";
    const { data: existing } = await db.from("articles").select("id").eq("slug", article.slug).maybeSingle();
    const payload = { title: article.title, slug: article.slug, excerpt: article.excerpt, content_html: article.content_html, cover_image_url: imageUrl || null, category: article.category, tags: article.tags || [], status, updated_at: new Date().toISOString(), published_at: status === "published" ? new Date().toISOString() : null };
    const query = existing ? db.from("articles").update(payload).eq("id", existing.id) : db.from("articles").insert(payload);
    const { data: saved, error } = await query.select("id,title,slug,status,cover_image_url").single();
    if (error) {
      const detail = [error.message, (error as any).hint, (error as any).details].filter(Boolean).join(' | ');
      throw new Error(`Article save failed: ${detail}`);
    }
    await db.rpc("record_ai_usage", { p_kind: "article" });
    const warnings:string[] = [];
    if (imageWarning) warnings.push(imageWarning);
    if (Array.isArray(article.sources) && saved?.id) {
      const sourceRows = article.sources.filter((s:any)=>s?.url).slice(0,12).map((s:any)=>({article_id:saved.id,title:s.title||s.url,url:s.url}));
      const sourceDelete = await db.from("article_sources").delete().eq("article_id", saved.id);
      if (sourceDelete.error) warnings.push(`Sources cleanup: ${sourceDelete.error.message}`);
      if (sourceRows.length) { const sourceInsert = await db.from("article_sources").insert(sourceRows); if (sourceInsert.error) warnings.push(`Sources save: ${sourceInsert.error.message}`); }
    }
    if (saved?.id && Array.isArray(article.story_slides) && article.story_slides.length) {
      const story = await db.from("web_stories").insert({article_id:saved.id,title:article.title,slides:article.story_slides,status,published_at:status === "published" ? new Date().toISOString() : null});
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
