"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Category {
  id: number;
  name: string;
  slug: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Safe fallback so the upload form still works if the categories table
// is temporarily unavailable or its read policy has not propagated yet.
const FALLBACK_CATEGORIES: Category[] = [
  { id: 1, name: "Viral / Trending", slug: "viral-trending" },
  { id: 2, name: "AI Portraits", slug: "ai-portraits" },
  { id: 3, name: "Instagram Photos", slug: "instagram-photos" },
  { id: 4, name: "Cinematic", slug: "cinematic" },
  { id: 5, name: "Retro / Vintage", slug: "retro-vintage" },
  { id: 6, name: "Wedding", slug: "wedding" },
  { id: 7, name: "Fashion", slug: "fashion" },
  { id: 8, name: "Professional", slug: "professional" },
  { id: 9, name: "Anime / Artistic", slug: "anime-artistic" },
  { id: 10, name: "Travel", slug: "travel" },
  { id: 11, name: "Before / After", slug: "before-after" },
  { id: 12, name: "Character Creation", slug: "character-creation" },
];

export default function Upload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      const { data, error: categoryError } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("name");

      if (!active) return;

      if (categoryError || !data?.length) {
        // Keep the form usable even if Supabase returns a temporary
        // permission/network error. The slugs match the seeded categories.
        setCategories(FALLBACK_CATEGORIES);
        return;
      }

      setCategories((data ?? []) as Category[]);
    }

    loadCategories();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  function chooseFile(file: File | null) {
    setMessage("");
    setError("");
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setSelectedFile(null);
      setError("Please choose a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setError("Image must be 10 MB or smaller.");
      return;
    }

    setSelectedFile(file);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0] ?? null);
  }

  function openFilePicker() {
    if (!submitting) fileInputRef.current?.click();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (submitting) return;

    const { data: userData, error: authError } = await supabase.auth.getUser();
    const user = userData.user;

    if (authError || !user) {
      setError("Please sign in before submitting a prompt.");
      return;
    }

    if (!selectedFile) {
      setError("Please choose an image first.");
      openFilePicker();
      return;
    }

    if (!title.trim() || !prompt.trim() || !category) {
      setError("Please fill in the title, prompt and category.");
      return;
    }

    const selectedCategory = categories.find((item) => item.slug === category);
    if (!selectedCategory) {
      setError("Please select a valid category.");
      return;
    }

    setSubmitting(true);

    const safeName = selectedFile.name
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image";
    const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("prompt-images")
        .upload(path, selectedFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: selectedFile.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message || "Could not upload the image.");
      }

      const { data: publicUrlData } = supabase.storage
        .from("prompt-images")
        .getPublicUrl(path);
      const imageUrl = publicUrlData.publicUrl;

      const { error: insertError } = await supabase.from("prompts").insert({
        creator_id: user.id,
        category_id: selectedCategory.id,
        title: title.trim(),
        prompt_text: prompt.trim(),
        image_url: imageUrl,
        status: "pending",
      });

      if (insertError) {
        await supabase.storage.from("prompt-images").remove([path]);
        throw new Error(insertError.message || "Could not save the submission.");
      }

      setSubmitted(true);
      setMessage("Submitted successfully. Your prompt is now Held for Review.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong while submitting your prompt."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSelectedFile(null);
    setTitle("");
    setPrompt("");
    setCategory("");
    setMessage("");
    setError("");
    setSubmitted(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (submitted) {
    return (
      <main className="simple-page">
        <Link href="/" className="brand">
          <span className="brand-mark">✦</span> IG<span>TRENDY</span>
        </Link>

        <section className="auth-card wide upload-success-card" role="status">
          <div className="success-icon">✓</div>
          <div className="eyebrow"><span /> SUBMISSION RECEIVED</div>
          <h1>Submitted for review.</h1>
          <p>
            Your image and prompt have been submitted successfully. It is now
            <strong> Held for Review</strong> and will appear publicly only after
            an admin publishes it.
          </p>
          {previewUrl && (
            <img className="success-preview" src={previewUrl} alt="Submitted preview" />
          )}
          <div className="success-actions">
            <button type="button" onClick={resetForm}>Submit another prompt</button>
            <Link className="backlink" href="/">← Back to IGTrendy</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="simple-page">
      <Link href="/" className="brand">
        <span className="brand-mark">✦</span> IG<span>TRENDY</span>
      </Link>

      <form className="auth-card wide" onSubmit={handleSubmit}>
        <div className="eyebrow">
          <span /> CREATOR STUDIO
        </div>
        <h1>Share your prompt.</h1>
        <p>
          Account creation is required before your first upload. Every
          submission is held for review.
        </p>

        <button
          type="button"
          className={`drop ${selectedFile ? "has-file" : ""}`}
          onClick={openFilePicker}
          aria-label="Choose image"
          disabled={submitting}
        >
          {previewUrl ? (
            <>
              <img className="upload-preview" src={previewUrl} alt="Selected preview" />
              <span className="upload-preview-label">Click to choose a different image</span>
            </>
          ) : (
            <>
              <span className="drop-icon">＋</span>
              <strong>Choose image</strong>
              <small>PNG, JPG or WEBP · Maximum 10 MB</small>
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Prompt title"
          required
          disabled={submitting}
        />

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Paste the exact AI prompt here..."
          required
          disabled={submitting}
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          disabled={submitting}
        >
          <option value="" disabled>
            Select category
          </option>
          {categories.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>

        <button type="submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit for Review"}
        </button>

        {error && (
          <div className="upload-message upload-error" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="upload-message" role="status">
            {message}
          </div>
        )}

        <Link className="backlink" href="/">
          ← Back to IGTrendy
        </Link>
      </form>
    </main>
  );
}
