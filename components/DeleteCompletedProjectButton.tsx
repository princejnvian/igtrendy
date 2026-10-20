"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteCompletedProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this completed project permanently? Project messages, files and its project record will be removed.")) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/delete`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete project.");
      router.push("/projects?status=completed");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to delete project.");
      setDeleting(false);
    }
  }

  return <button type="button" onClick={remove} disabled={deleting} className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60">{deleting ? "Deleting..." : "Delete completed project"}</button>;
}