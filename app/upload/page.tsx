"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Upload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setMessage(file ? `Selected: ${file.name}` : "");
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      setMessage("Please sign in before submitting a prompt.");
      return;
    }

    if (!selectedFile) {
      setMessage("Please choose an image first.");
      openFilePicker();
      return;
    }

    if (!title.trim() || !prompt.trim() || !category) {
      setMessage("Please fill in the title, prompt and category.");
      return;
    }

    // The file picker and form validation are now fully wired.
    // Storage/database submission can be connected once the production
    // Supabase Storage bucket and its RLS policies are enabled.
    setMessage(
      "Ready to submit! Image and prompt details are filled correctly. The final publish flow will remain Held for Review."
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
        >
          <span className="drop-icon">{selectedFile ? "✓" : "＋"}</span>
          <strong>{selectedFile ? selectedFile.name : "Choose image"}</strong>
          <small>
            {selectedFile
              ? "Click to choose a different image"
              : "PNG, JPG or WEBP · Recommended 4:5"}
          </small>
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
        />

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Paste the exact AI prompt here..."
          required
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="" disabled>
            Select category
          </option>
          <option value="retro-vintage">Retro / Vintage</option>
          <option value="ai-portraits">AI Portraits</option>
          <option value="cinematic">Cinematic</option>
          <option value="fashion">Fashion</option>
          <option value="wedding">Wedding</option>
        </select>

        <button type="submit">Submit for Review</button>

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
