import { NextResponse } from "next/server";
import { requireAdmin, serviceClient, slugify } from "@/lib/server";

export const maxDuration = 120;

function extractJson(text: string) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{"); const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("AI returned an invalid content object.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

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

    const configuredModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    // Use only currently documented model IDs. If one model is busy or returns
    // malformed JSON, continue to the next model instead of treating that
    // response as a successful generation.
    const fallbackModels = [
      configuredModel,
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemini-3.8-flash",
      "gemini-2.5-flash-lite"
    ].filter((v,i,a)=>v && a.indexOf(v)===i);

    let article:any = null;
    let lastError = "Gemini article generation failed.";

    for (let i=0; i<fallbackModels.length && !article; i++) {
      const model = fallbackModels[i];
      // Try each model up to 3 times for temporary capacity/rate-limit errors.
      for (let retry=0; retry<3 && !article; retry++) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
            method:"POST",
            headers:{"Content-Type":"application/json","x-goog-api-key":key},
            body:JSON.stringify({
              contents:[{role:"user",parts:[{text:prompt}]}],
              generationConfig:{temperature:0.25,responseMimeType:"application/json"}
            })
          });

          if (!response.ok) {
            let detail=`HTTP ${response.status}`;
            try { const e=await response.json(); detail=String(e?.error?.message||detail); } catch {}
            lastError=`${model}: ${detail}`;
            if ((response.status===429 || response.status===503) && retry<2) {
              await new Promise(r=>setTimeout(r,1200*(2**retry)));
              continue;
            }
            break;
          }

          const raw=await response.json();
          const text = raw.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("") || "";

          if (!text.trim()) {
            lastError=`${model}: Gemini returned an empty response.`;
            break;
          }

          // Some transient/model-side responses can arrive with HTTP 200 but
          // contain plain text such as "An error occurred...". Treat malformed
          // JSON as a failed attempt and move to the next model.
          try {
            article = extractJson(text);
          } catch (parseError:any) {
            lastError=`${model}: ${parseError?.message || "Invalid JSON response."}`;
            break;
          }
        } catch (networkError:any) {
          lastError=`${model}: ${networkError?.message || "Network request failed."}`;
          if (retry<2) {
            await new Promise(r=>setTimeout(r,1200*(2**retry)));
            continue;
          }
        }
      }
    }

    if (!article) throw new Error(`Gemini article generation failed. ${lastError}`);
    article.slug = slugify(article.slug || article.title);

    let imageUrl = "";
    const canGenerateImage = body.generateImage !== false && (usage?.image_count || 0) < imageLimit;
    if (canGenerateImage) {
      try {
        const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
        const img = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
          method:"POST",
          headers:{"Content-Type":"application/json","x-goog-api-key":key},
          body:JSON.stringify({
            model:imageModel,
            input:String(article.image_prompt || article.title).slice(0,3000),
            response_format:{type:"image",mime_type:"image/png",aspect_ratio:"16:9",image_size:"1K"}
          })
        });
        if (img.ok) {
          const data=await img.json();
          const b64 = data.output_image?.data
            || data.steps?.flatMap((step:any)=>Array.isArray(step?.content)?step.content:[])?.find((x:any)=>x?.type==="image")?.data
            || data.output?.find((x:any)=>x?.type==="image")?.data;
          if (b64) {
            const bytes=Buffer.from(b64,"base64");
            const path=`ai-generated/${crypto.randomUUID()}.png`;
            const up=await db.storage.from("prompt-images").upload(path,bytes,{contentType:"image/png",upsert:false});
            if(!up.error){imageUrl=db.storage.from("prompt-images").getPublicUrl(path).data.publicUrl;await db.rpc("record_ai_usage", {p_kind:"image"});}
          }
        }
      } catch { /* article can still be saved if image generation is temporarily unavailable */ }
    }

    const status = mode === "publish" ? "published" : "draft";
    const { data: existing } = await db.from("articles").select("id").eq("slug", article.slug).maybeSingle();
    const payload = { title: article.title, slug: article.slug, excerpt: article.excerpt, content_html: article.content_html, cover_image_url: imageUrl || null, category: article.category, tags: article.tags || [], status, updated_at: new Date().toISOString(), published_at: status === "published" ? new Date().toISOString() : null };
    const query = existing ? db.from("articles").update(payload).eq("id", existing.id) : db.from("articles").insert(payload);
    const { data: saved, error } = await query.select("id,title,slug,status,cover_image_url").single();
    if (error) throw new Error(error.message);
    await db.rpc("record_ai_usage", { p_kind: "article" });
    if (Array.isArray(article.sources) && saved?.id) { await db.from("article_sources").delete().eq("article_id", saved.id); await db.from("article_sources").insert(article.sources.filter((s:any)=>s?.url).slice(0,12).map((s:any)=>({article_id:saved.id,title:s.title||s.url,url:s.url}))); }
    if (saved?.id && Array.isArray(article.story_slides) && article.story_slides.length) { await db.from("web_stories").insert({article_id:saved.id,title:article.title,slides:article.story_slides,status,published_at:status === "published" ? new Date().toISOString() : null}); }
    return NextResponse.json({ ok:true, article:saved, message: status === "published" ? (existing ? "Article updated and published." : "Article published.") : (existing ? "Article updated as draft." : "Article saved as draft.") });
  } catch (e:any) { return NextResponse.json({ error:e.message||"Command failed." }, {status: e.message?.includes("Admin") ? 403 : 500}); }
}
