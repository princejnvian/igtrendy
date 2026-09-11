"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Submission {
  id: string;
  title: string;
  prompt_text: string;
  image_url: string;
  status: string;
  created_at: string;
  creator_id: string | null;
  creator_username: string | null;
  creator_full_name: string | null;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
}

export default function Admin() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);

  async function loadSubmissions() {
    setLoading(true);
    setError("");

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setError("Please sign in with your admin account.");
      setLoading(false);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc(
      "admin_pending_prompts"
    );

    if (rpcError) {
      setError(rpcError.message || "You do not have admin access.");
      setLoading(false);
      return;
    }

    setSubmissions((data ?? []) as Submission[]);
    setLoading(false);
  }

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function moderate(id: string, action: "publish" | "reject") {
    setWorkingId(id);
    setError("");

    const { error: rpcError } = await supabase.rpc("admin_moderate_prompt", {
      p_prompt_id: id,
      p_action: action,
    });

    if (rpcError) {
      setError(rpcError.message || "Could not update this submission.");
      setWorkingId(null);
      return;
    }

    setSubmissions((current) => current.filter((item) => item.id !== id));
    setWorkingId(null);
  }

  return (
    <main className="admin-page">
      <header className="detail-nav">
        <Link href="/">← Site</Link>
        <strong>IGTrendy Studio</strong>
        <span>Admin</span>
      </header>

      <div className="admin-wrap">
        <div className="eyebrow"><span /> MODERATION QUEUE</div>
        <h1>Review submissions.</h1>
        <p className="muted">
          Approve quality prompts before they appear publicly.
        </p>

        <div className="admin-tabs">
          Pending <span>{submissions.length}</span>
        </div>

        {error && (
          <div className="admin-prompt" style={{ marginBottom: 20 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="submission">
            <div>
              <h2>Loading moderation queue…</h2>
              <p className="muted">Checking your admin permissions and submissions.</p>
            </div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="submission">
            <div>
              <span className="detail-cat">ALL CLEAR</span>
              <h2>No pending submissions</h2>
              <p className="muted">New uploads will appear here after users submit them for review.</p>
            </div>
          </div>
        ) : (
          submissions.map((submission) => (
            <div className="submission" key={submission.id}>
              <div className="admin-thumb">
                <img src={submission.image_url} alt={submission.title} />
              </div>

              <div>
                <span className="detail-cat">
                  {submission.category_name ?? "Uncategorized"}
                </span>
                <h2>{submission.title}</h2>
                <p>
                  Submitted by <b>{submission.creator_full_name || submission.creator_username || "Creator"}</b>
                  {submission.creator_username ? ` · @${submission.creator_username}` : ""}
                  {` · ${new Date(submission.created_at).toLocaleString()}`}
                </p>

                <div className="admin-prompt">{submission.prompt_text}</div>

                <div className="admin-buttons">
                  <button
                    className="reject"
                    disabled={workingId === submission.id}
                    onClick={() => moderate(submission.id, "reject")}
                  >
                    {workingId === submission.id ? "Working…" : "Reject"}
                  </button>
                  <button
                    disabled={workingId === submission.id}
                    onClick={() => moderate(submission.id, "publish")}
                  >
                    {workingId === submission.id ? "Working…" : "Publish"}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
