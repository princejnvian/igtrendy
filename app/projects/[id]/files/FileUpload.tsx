"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  projectId: string;
};

export default function FileUpload({ projectId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleUpload() {
    if (!file) {
      setError("Please choose a file first.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/projects/${projectId}/files/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Unable to upload this file.");
      }

      setMessage("File uploaded successfully!");
      setFile(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while uploading.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-3xl">
          📁
        </div>

        <h3 className="mt-4 text-lg font-bold">Upload a project file</h3>
        <p className="mt-2 text-sm text-slate-500">Select a file and upload it to this project.</p>

        <input
          type="file"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setError("");
            setMessage("");
          }}
          className="mx-auto mt-5 block w-full max-w-md rounded-xl border border-slate-300 bg-white p-3 text-sm"
        />

        {file && <p className="mt-3 text-sm font-medium text-slate-700">Selected: {file.name}</p>}

        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload File"}
        </button>

        {message && <p className="mt-4 text-sm font-semibold text-emerald-600">{message}</p>}
        {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      </div>
    </div>
  );
}
