import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FileUpload from "./FileUpload";

import YoutentLogo from "@/components/YoutentLogo";
type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function FilesPage({ params }: Props) {
  const supabase = await createClient();

  // Logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  // Get project
  const { data: project, error } = await supabase
    .from("projects")
    .select(`
      id,
      client_id,
      freelancer_id,
      title,
      description
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !project) {
    notFound();
  }

  // Only project members can access files
  if (
    project.client_id !== user.id &&
    project.freelancer_id !== user.id
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center youtent-app-bg px-6 text-slate-900">
        <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">
            🔒
          </div>

          <h1 className="mt-5 text-2xl font-black">
            Access Denied
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            You are not allowed to access this project.
          </p>

          <Link
            href="/dashboard"
            className="mt-7 inline-flex rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const isClient = project.client_id === user.id;

  // Files are available only after the client has completed payment.
  const { data: payment } = await supabase
    .from("payments")
    .select("status")
    .eq("project_id", project.id)
    .maybeSingle();

  const paymentPaid = payment?.status === "paid";

  if (!paymentPaid) {
    return (
      <main className="min-h-screen youtent-app-bg text-slate-900">
        <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
            <YoutentLogo href="/dashboard" />
            <Link href={`/projects/${project.id}`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm">← Back to Project</Link>
          </div>
        </nav>
        <section className="mx-auto flex max-w-3xl px-5 py-16 sm:px-6">
          <div className="w-full rounded-[28px] border border-violet-100 bg-gradient-to-br from-white to-violet-50/70 p-8 text-center shadow-xl shadow-slate-200/30 sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-2xl">🔒</div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-violet-600">Payment required</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Project files are locked</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              File sharing will be available after the client completes the project payment.
            </p>
            <Link href={`/projects/${project.id}`} className="mt-7 inline-flex rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20">Back to Project</Link>
          </div>
        </section>
      </main>
    );
  }

  // Get files from Supabase Storage
  const {
    data: files,
    error: filesError,
  } = await supabase.storage
    .from("project-files")
    .list(project.id, {
      limit: 100,
      sortBy: {
        column: "created_at",
        order: "desc",
      },
    });

  // Create signed URLs before rendering
  const filesWithUrls =
    files && !filesError
      ? await Promise.all(
          files.map(async (file) => {
            const filePath = `${project.id}/${file.name}`;

            const { data: signedUrlData } =
              await supabase.storage
                .from("project-files")
                .createSignedUrl(filePath, 60 * 60);

            return {
              ...file,
              signedUrl: signedUrlData?.signedUrl || null,
            };
          })
        )
      : [];

  const fileCount = filesWithUrls.length;

  return (
    <main className="min-h-screen youtent-app-bg text-slate-900">

      {/* Decorative background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-blue-200/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-violet-200/20 blur-3xl" />
      </div>

      {/* ================= NAVBAR ================= */}

      <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">

          <YoutentLogo href="/dashboard" />

          <Link
            href={`/projects/${project.id}`}
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">
              ←
            </span>
            Back to Project
          </Link>

        </div>
      </nav>

      {/* ================= MAIN ================= */}

      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-12">

        {/* Header */}

        <div className="mb-8">

          <div className="flex flex-wrap items-center gap-3">

            <span className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-violet-600">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
              Project Files
            </span>

            <span className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-500">
              {fileCount} {fileCount === 1 ? "file" : "files"}
            </span>

          </div>

          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Files & Documents
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
            Share project files securely with your{" "}
            {isClient ? "freelancer" : "client"} and keep everything
            organized in one place.
          </p>

        </div>

        {/* ================= PROJECT INFO ================= */}

        <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/30">

          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">

            <div className="flex min-w-0 items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 text-xl">
                📁
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Current Project
                </p>

                <h2 className="mt-1 truncate text-xl font-black text-slate-950">
                  {project.title}
                </h2>

                {project.description && (
                  <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-slate-500">
                    {project.description}
                  </p>
                )}
              </div>

            </div>

            <div className="shrink-0 rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Your Role
              </p>

              <p className="mt-1 text-sm font-black text-slate-900">
                {isClient ? "Client" : "Freelancer"}
              </p>
            </div>

          </div>

        </div>

        {/* ================= UPLOAD ================= */}

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/30">

          <div className="border-b border-slate-100 px-6 py-5 sm:px-7">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg">
                ⬆️
              </div>

              <div>
                <h2 className="font-black text-slate-950">
                  Upload a File
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Add documents, assets or other project files.
                </p>
              </div>

            </div>

          </div>

          <div className="p-6 sm:p-7">
            <FileUpload projectId={project.id} />
          </div>

        </div>

        {/* ================= FILE LIST ================= */}

        <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/30">

          {/* Header */}

          <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">

            <div>
              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-lg">
                  📂
                </div>

                <div>
                  <h2 className="font-black text-slate-950">
                    Project Files
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Files shared for this project.
                  </p>
                </div>

              </div>
            </div>

            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
              {fileCount} {fileCount === 1 ? "file" : "files"}
            </div>

          </div>

          {/* ================= ERROR ================= */}

          {filesError && (
            <div className="p-6 sm:p-7">

              <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">

                <div className="flex items-start gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-base">
                    ⚠️
                  </div>

                  <div>
                    <p className="font-black">
                      Unable to load project files.
                    </p>

                    <p className="mt-1 text-xs leading-5 text-red-600/80">
                      {filesError.message}
                    </p>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* ================= EMPTY ================= */}

          {!filesError &&
            filesWithUrls.length === 0 && (
              <div className="flex min-h-[330px] items-center justify-center p-8 text-center">

                <div className="max-w-sm">

                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-blue-50 to-violet-50 text-3xl shadow-sm">
                    📂
                  </div>

                  <h3 className="mt-6 text-xl font-black text-slate-950">
                    No files yet
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Upload your first project file above. It will
                    appear here once uploaded.
                  </p>

                </div>

              </div>
            )}

          {/* ================= FILES ================= */}

          {!filesError &&
            filesWithUrls.length > 0 && (
              <div className="divide-y divide-slate-100">

                {filesWithUrls.map((file) => {

                  const fileSize =
                    file.metadata?.size
                      ? formatFileSize(
                          Number(file.metadata.size)
                        )
                      : "Unknown size";

                  return (
                    <div
                      key={`${file.name}-${file.created_at}`}
                      className="group flex flex-col gap-5 p-5 transition duration-300 hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                    >

                      {/* File Info */}

                      <div className="flex min-w-0 items-center gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-xl transition duration-300 group-hover:scale-105">
                          📄
                        </div>

                        <div className="min-w-0">

                          <h3 className="truncate text-sm font-black text-slate-900 sm:text-base">
                            {file.name}
                          </h3>

                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">

                            <span>
                              {fileSize}
                            </span>

                            {file.created_at && (
                              <>
                                <span>•</span>

                                <span>
                                  {new Date(
                                    file.created_at
                                  ).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              </>
                            )}

                          </div>

                        </div>

                      </div>

                      {/* Actions */}

                      <div className="flex shrink-0 gap-2">

                        <a
                          href={file.signedUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/open inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md sm:flex-none"
                        >
                          Open
                          <span className="transition-transform group-hover/open:translate-x-0.5">
                            ↗
                          </span>
                        </a>

                        <a
                          href={file.signedUrl || "#"}
                          download={file.name}
                          className="group/download inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-600/15 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:flex-none"
                        >
                          Download
                          <span className="transition-transform group-hover/download:translate-y-0.5">
                            ↓
                          </span>
                        </a>

                      </div>

                    </div>
                  );
                })}

              </div>
            )}

        </div>

        {/* Bottom Navigation */}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">

          <Link
            href={`/projects/${project.id}`}
            className="group rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600">
              ← Project Overview
            </span>
          </Link>

          <Link
            href={`/projects/${project.id}/messages`}
            className="group rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
          >
            <span className="text-sm font-bold text-slate-600 group-hover:text-violet-600">
              Project Messages →
            </span>
          </Link>

        </div>

        {/* Footer */}

        <div className="mt-8 flex flex-col items-center justify-between gap-2 text-xs text-slate-400 sm:flex-row">
          <span>YOUTENT Project Workspace</span>
          <span>Where Talent Meets Opportunity</span>
        </div>

      </section>

    </main>
  );
}

/* =========================
   FILE SIZE FORMATTER
========================= */

function formatFileSize(bytes: number) {
  if (bytes === 0) {
    return "0 Bytes";
  }

  const units = [
    "Bytes",
    "KB",
    "MB",
    "GB",
    "TB",
  ];

  const index = Math.floor(
    Math.log(bytes) / Math.log(1024)
  );

  return (
    parseFloat(
      (bytes / Math.pow(1024, index)).toFixed(2)
    ) +
    " " +
    units[index]
  );
}