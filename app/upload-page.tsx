"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Category = {
  id: number;
  name: string;
  slug: string;
};

export default function Upload() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [{ data: userData }, { data: categoryData, error: categoryError }] =
        await Promise.all([
          supabase.auth.getUser(),
          supabase.from("categories").select("id, name, slug").order("name"),
        ]);

      if (!mounted) return;

      setUser(userData.user ?? null);
      if (categoryError) {
        setError(categoryError.message || "Could not load categories.");
      } else {
        setCategories((categoryData ?? []) as Category[]);
      }
      setAuthLoading(false);
    }

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const previewUrl = useMemo(
    () => (image ? URL.createObjectURL(image) : ""),
    [image]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError("");
    setMessage("");

    if (!file) {
      setImage(null);
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      event.target.value = "";
      setImage(null);
      setError("Please choose a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      event.target.value = "";
      setImage(null);
      setError("Image must be 10 MB or smaller.");
      return;
    }

    setImage(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!user) {
      setError("Please sign in before submitting a prompt.");
      return;
    }

    if (!image) {
      setError("Please choose an image first.");
      return;
    }

    if (!title.trim()) {
      setError("Please add a title.");
      return;
    }

    if (!prompt.trim()) {
      setError("Please paste the exact AI prompt.");
      return;
    }

    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    setSubmitting(true);

    const extension = image.type === "image/png"
      ? "png"
      : image.type === "image/webp"
        ? "webp"
        : "jpg";
    const storagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("prompt-images")
      .upload(storagePath, image, {
        contentType: image.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      setError(uploadError.message || "Image upload failed.");
      setSubmitting(false);
      return;
    }

    const { data: publicData } = supabase.storage
      .from("prompt-images")
      .getPublicUrl(storagePath);

    const { error: insertError } = await supabase.from("prompts").insert({
      creator_id: user.id,
      category_id: Number(categoryId),
      title: title.trim(),
      prompt_text: prompt.trim(),
      image_url: publicData.publicUrl,
      status: "pending",
    });

    if (insertError) {
      await supabase.storage.from("prompt-images").remove([storagePath]);
      setError(insertError.message || "Could not create the prompt submission.");
      setSubmitting(false);
      return;
    }

    setImage(null);
    setTitle("");
    setPrompt("");
    setCategoryId("");
    setMessage("Submitted successfully. Your prompt is now Held for Review.");
    setSubmitting(false);
  }

  if (authLoading) {
    return (
      <main className="simple-page">
        <Link href="/" className="brand"><span className="brand-mark">✦</span> IG<span>TRENDY</span></Link>
        <div className="auth-card wide"><p>Checking your account…</p></div>
      </main>
    );
  }

  return (
    <main className="simple-page">
      <Link href="/" className="brand"><span className="brand-mark">✦</span> IG<span>TRENDY</span></Link>

      <form className="auth-card wide" onSubmit={handleSubmit}>
        <div className="eyebrow"><span/> CREATOR STUDIO</div>
        <h1>Share your prompt.</h1>
        <p>Upload your image and exact AI prompt. Every submission is held for review before it appears publicly.</p>

        <label className="drop" htmlFor="prompt-image">
          {previewUrl ? (
            <img src={previewUrl} alt="Selected preview" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 13 }} />
          ) : (
            <>
              <span style={{ fontSize: 28 }}>＋</span>
              <strong>Choose image</strong>
              <small>PNG, JPG or WEBP · Max 10 MB · Recommended 4:5</small>
            </>
          )}
        </label>
        <input
          id="prompt-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageChange}
          style={{ display: "none" }}
        />
        {image && <div className="upload-file-name">Selected: {image.name}</div>}

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Prompt title"
          maxLength={120}
        />
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Paste the exact AI prompt here..."
          maxLength={12000}
        />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="" disabled>Select category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>

        {error && <div className="upload-message error">{error}</div>}
        {message && <div className="upload-message success">{message}</div>}

        <button type="submit" disabled={submitting || !user}>
          {submitting ? "Uploading…" : "Submit for Review"}
        </button>
        {!user && <small>Please <Link href="/login">sign in</Link> to upload a prompt.</small>}
        <Link className="backlink" href="/">← Back to IGTrendy</Link>
      </form>
    </main>
  );
}
