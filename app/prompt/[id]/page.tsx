import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PromptActions from "./PromptActions";

const staticPrompts: Record<string, {
  title: string;
  creator: string;
  cat: string;
  image: string;
  prompt: string;
  views: string;
  likes: string;
}> = {
  "retro-80s": {
    title: "80s Indian Retro Portrait",
    creator: "Prince",
    cat: "Retro / Vintage",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=90",
    views: "18,420",
    likes: "1,240",
    prompt: "Create a highly realistic 1980s Indian portrait with authentic film grain, warm analog colors, period-correct hairstyle and clothing, soft studio lighting, natural skin texture, vintage camera look, subtle imperfections, cinematic composition, and an unmistakable early-80s atmosphere. Preserve the person's facial identity.",
  },
  "cinematic-man": {
    title: "Cinematic Street Portrait",
    creator: "Aarav",
    cat: "Cinematic",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=90",
    views: "12,110",
    likes: "932",
    prompt: "Create a cinematic editorial portrait on a rain-soaked city street at night, realistic skin, dramatic practical lights, shallow depth of field, subtle film grain, rich shadows, premium photography, 85mm lens.",
  },
};

type PromptData = {
  id: string;
  title: string;
  creator: string;
  cat: string;
  image: string;
  prompt: string;
  views: number;
  likes: number;
};

async function getPrompt(id: string): Promise<PromptData | null> {
  const staticPrompt = staticPrompts[id];
  if (staticPrompt) {
    return {
      id,
      ...staticPrompt,
      views: Number(staticPrompt.views.replaceAll(",", "")),
      likes: Number(staticPrompt.likes.replaceAll(",", "")),
    };
  }

  const { data, error } = await supabase
    .from("prompts")
    .select(`
      id,
      title,
      prompt_text,
      image_url,
      views,
      likes,
      creator_id,
      category_id,
      profiles:creator_id (username, full_name),
      categories:category_id (name)
    `)
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) return null;

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const category = Array.isArray(data.categories) ? data.categories[0] : data.categories;

  return {
    id: String(data.id),
    title: data.title,
    creator: profile?.full_name || profile?.username || "Creator",
    cat: category?.name || "AI Prompts",
    image: data.image_url,
    prompt: data.prompt_text,
    views: Number(data.views ?? 0),
    likes: Number(data.likes ?? 0),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const prompt = await getPrompt(id);

  if (!prompt) {
    return { title: "Prompt not found" };
  }

  return {
    title: `${prompt.title} — AI Prompt`,
    description: `Copy the ${prompt.title} AI image prompt on IGTrendy. Category: ${prompt.cat}.`,
    alternates: {
      canonical: `https://igtrendy.in/prompt/${prompt.id}`,
    },
    openGraph: {
      title: `${prompt.title} — IGTrendy`,
      description: `Discover and copy this ${prompt.cat} AI image prompt on IGTrendy.`,
      url: `https://igtrendy.in/prompt/${prompt.id}`,
      images: [{ url: prompt.image }],
    },
  };
}

export default async function PromptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getPrompt(id);

  if (!p) notFound();

  return (
    <main className="detail-page">
      <header className="detail-nav">
        <Link href="/">← Back to explore</Link>
        <Link className="brand" href="/">
          <span className="brand-mark">✦</span> IG<span>TRENDY</span>
        </Link>
        <Link href={`/profile/${encodeURIComponent(p.creator)}`}>View profile</Link>
      </header>

      <section className="detail-grid">
        <div className="detail-image">
          <img src={p.image} alt={p.title} />
        </div>

        <div className="detail-copy">
          <span className="detail-cat">{p.cat}</span>
          <h1>{p.title}</h1>

          <div className="detail-author">
            <span className="avatar">{p.creator[0]?.toUpperCase() || "C"}</span>
            <div>
              <b>{p.creator}</b>
              <small>Creator · {p.views.toLocaleString()} views</small>
            </div>
            <Link href={`/profile/${encodeURIComponent(p.creator)}`}>View Profile →</Link>
          </div>

          <div className="prompt-box">
            <div className="prompt-label">PROMPT</div>
            <p>{p.prompt}</p>
            <PromptActions prompt={p.prompt} />
          </div>

          <div className="detail-meta">
            ♡ {p.likes.toLocaleString()} likes · ◉ {p.views.toLocaleString()} views
          </div>
        </div>
      </section>
    </main>
  );
}
