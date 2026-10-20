import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import FileUpload from "../files/FileUpload";

import YoutentLogo from "@/components/YoutentLogo";
type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DeliveryPage({ params }: Props) {
  const supabase = await createClient();

  // =========================
  // AUTH
  // =========================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  // =========================
  // GET PROJECT
  // =========================

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(`
      id,
      request_id,
      client_id,
      freelancer_id,
      title,
      description,
      budget,
      deadline,
      status
    `)
    .eq("id", id)
    .maybeSingle();

  if (projectError || !project) {
    notFound();
  }

  // =========================
  // ACCESS CHECK
  // =========================

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
  const isFreelancer = project.freelancer_id === user.id;

  // Delivery is available only after the client has completed payment.
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
          <div className="w-full rounded-[28px] border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 p-8 text-center shadow-xl shadow-slate-200/30 sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">🔒</div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Payment required</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Delivery is locked</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              Delivery tools will be available after the client completes the project payment.
            </p>
            <Link href={`/projects/${project.id}`} className="mt-7 inline-flex rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20">Back to Project</Link>
          </div>
        </section>
      </main>
    );
  }

  // =========================
  // GET LATEST DELIVERY
  // =========================

  const { data: latestDelivery } = await supabase
    .from("project_deliveries")
    .select(`
      id,
      project_id,
      freelancer_id,
      client_id,
      message,
      file_path,
      file_name,
      status,
      created_at,
      updated_at
    `)
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // =========================
  // GET PROJECT FILES
  // =========================

  const {
    data: projectFiles,
    error: projectFilesError,
  } = await supabase.storage
    .from("project-files")
    .list(project.id, {
      limit: 100,
      sortBy: {
        column: "created_at",
        order: "desc",
      },
    });

  // =========================
  // DELIVERY FILE URL
  // =========================

  let deliveryFileUrl: string | null = null;

  if (latestDelivery?.file_path) {
    const { data: signedUrlData } = await supabase.storage
      .from("project-files")
      .createSignedUrl(
        latestDelivery.file_path,
        60 * 60
      );

    deliveryFileUrl =
      signedUrlData?.signedUrl || null;
  }

  // =========================
  // STATUS
  // =========================

  const hasDelivery = !!latestDelivery;

  const deliveryStatus =
    latestDelivery?.status || null;

  const isSubmitted =
    deliveryStatus === "submitted";

  const isRevisionRequested =
    deliveryStatus === "revision_requested";

  const isApproved =
    deliveryStatus === "approved";

  // =========================
  // PAGE
  // =========================

  return (
    <main className="min-h-screen youtent-app-bg text-slate-900">

      {/* =========================
          BACKGROUND
      ========================= */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-80 w-80 rounded-full bg-blue-200/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-violet-200/20 blur-3xl" />
      </div>

      {/* =========================
          NAVBAR
      ========================= */}

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

      {/* =========================
          MAIN
      ========================= */}

      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-12">

        {/* =========================
            HEADER
        ========================= */}

        <div className="mb-8">

          <div className="flex flex-wrap items-center gap-3">

            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Project Delivery
            </span>

            <span className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-500">
              {isClient
                ? "Client Workspace"
                : "Freelancer Workspace"}
            </span>

          </div>

          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Delivery Workspace
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
            {isFreelancer
              ? "Submit your completed work to the client and manage revisions."
              : "Review the work submitted by your freelancer and approve the final delivery."}
          </p>

        </div>

        {/* =========================
            PROJECT CARD
        ========================= */}

        <div className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-lg shadow-slate-200/30">

          <div className="p-6 sm:p-7">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 text-xl">
                📁
              </div>

              <div className="min-w-0">

                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Current Project
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
                  {project.title}
                </h2>

              </div>

            </div>

            {project.description && (
              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-500">
                {project.description}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-2">

              <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
                Status: {project.status}
              </span>

              {project.budget !== null && (
                <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
                  Budget: ₹{project.budget}
                </span>
              )}

              {project.deadline && (
                <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
                  Deadline:{" "}
                  {new Date(
                    project.deadline
                  ).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}

            </div>

          </div>

        </div>

        {/* =========================================================
            FREELANCER VIEW
        ========================================================= */}

        {isFreelancer && (
          <div className="space-y-6">

            {/* =========================
                DELIVERY STATUS
            ========================= */}

            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/30">

              <div className="p-6 sm:p-7">

                <div className="flex items-center gap-4">

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-2xl">
                    {isApproved
                      ? "✅"
                      : isRevisionRequested
                      ? "🔄"
                      : isSubmitted
                      ? "⏳"
                      : "🚀"}
                  </div>

                  <div>

                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Delivery Status
                    </p>

                    <h2 className="mt-1 text-xl font-black text-slate-950">

                      {!hasDelivery &&
                        "Ready for Delivery"}

                      {isSubmitted &&
                        "Waiting for Client Review"}

                      {isRevisionRequested &&
                        "Revision Requested"}

                      {isApproved &&
                        "Delivery Approved"}

                    </h2>

                  </div>

                </div>

                <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-5">

                  {!hasDelivery && (
                    <p className="text-sm leading-6 text-slate-600">
                      Your work is ready. Select your final project file
                      and submit it to the client.
                    </p>
                  )}

                  {isSubmitted && (
                    <p className="text-sm leading-6 text-slate-600">
                      Your delivery has been submitted successfully.
                      Please wait for the client to review it.
                    </p>
                  )}

                  {isRevisionRequested && (
                    <p className="text-sm leading-6 text-slate-600">
                      The client has requested a revision. Review their
                      feedback and submit the updated work.
                    </p>
                  )}

                  {isApproved && (
                    <p className="text-sm leading-6 text-slate-600">
                      The client has approved your delivery. This project
                      is now completed.
                    </p>
                  )}

                </div>

              </div>

            </div>

            {/* =========================
                PREVIOUS DELIVERY
            ========================= */}

            {latestDelivery && (
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/30">

                <div className="border-b border-slate-100 px-6 py-5 sm:px-7">

                  <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                    Latest Delivery
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Submitted Work
                  </h2>

                </div>

                <div className="p-6 sm:p-7">

                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Delivery Message
                  </p>

                  <div className="mt-3 rounded-2xl bg-slate-50 p-5">

                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                      {latestDelivery.message}
                    </p>

                  </div>

                  {latestDelivery.file_path && (
                    <div className="mt-6">

                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Final File
                      </p>

                      <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">

                        <div className="flex min-w-0 items-center gap-4">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                            📄
                          </div>

                          <div className="min-w-0">

                            <p className="truncate text-sm font-black text-slate-900">
                              {latestDelivery.file_name ||
                                latestDelivery.file_path
                                  .split("/")
                                  .pop()}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Submitted project file
                            </p>

                          </div>

                        </div>

                        {deliveryFileUrl && (
                          <a
                            href={deliveryFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
                          >
                            Open File ↗
                          </a>
                        )}

                      </div>

                    </div>
                  )}

                </div>

              </div>
            )}

            {/* =========================
                SUBMIT / RESUBMIT
            ========================= */}

            {project.status === "active" &&
              (!latestDelivery || isRevisionRequested) && (

                <form
                  action={async (formData) => {
                    "use server";

                    const message =
                      formData
                        .get("message")
                        ?.toString() || "";

                    const filePath =
                      formData
                        .get("file_path")
                        ?.toString() || "";

                    const fileName =
                      filePath.split("/").pop() || "";

                    const supabase =
                      await createClient();

                    const {
                      data: { user },
                    } = await supabase.auth.getUser();

                    if (!user) {
                      redirect("/login");
                    }

                    if (!message.trim()) {
                      return;
                    }

                    if (!filePath) {
                      return;
                    }

                    // =========================
                    // VERIFY PROJECT
                    // =========================

                    const {
                      data: projectCheck,
                    } = await supabase
                      .from("projects")
                      .select(`
                        id,
                        client_id,
                        freelancer_id,
                        status
                      `)
                      .eq("id", project.id)
                      .maybeSingle();

                    if (!projectCheck) {
                      notFound();
                    }

                    if (
                      projectCheck.freelancer_id !==
                      user.id
                    ) {
                      return;
                    }

                    if (
                      projectCheck.status !==
                      "active"
                    ) {
                      return;
                    }

                    // =========================
                    // VERIFY FILE PATH
                    // =========================

                    if (
                      !filePath.startsWith(
                        `${projectCheck.id}/`
                      )
                    ) {
                      return;
                    }

                    // =========================
                    // VERIFY FILE ACTUALLY EXISTS
                    // =========================

                    const fileNameFromPath =
                      filePath
                        .split("/")
                        .pop();

                    if (!fileNameFromPath) {
                      return;
                    }

                    const {
                      data: availableFiles,
                    } = await supabase.storage
                      .from("project-files")
                      .list(projectCheck.id, {
                        limit: 100,
                      });

                    const selectedFileExists =
                      availableFiles?.some(
                        (file) =>
                          file.name ===
                          fileNameFromPath
                      );

                    if (!selectedFileExists) {
                      return;
                    }

                    // =========================
                    // CREATE DELIVERY
                    // =========================

                    const { error } =
                      await supabase
                        .from("project_deliveries")
                        .insert({
                          project_id:
                            projectCheck.id,

                          freelancer_id:
                            user.id,

                          client_id:
                            projectCheck.client_id,

                          message:
                            message.trim(),

                          file_path:
                            filePath,

                          file_name:
                            fileName,

                          status:
                            "submitted",
                        });

                    if (error) {
                      console.error(
                        "Delivery insert error:",
                        error
                      );

                      return;
                    }

                    redirect(
                      `/projects/${project.id}/delivery`
                    );
                  }}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/30"
                >

                  <div className="border-b border-slate-100 px-6 py-5 sm:px-7">

                    <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                      {isRevisionRequested
                        ? "Submit Revision"
                        : "Submit Work"}
                    </p>

                    <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
                      {isRevisionRequested
                        ? "Updated Delivery"
                        : "Final Delivery"}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {isRevisionRequested
                        ? "Select your revised work and send it to the client."
                        : "Select your completed project file and send it to the client."}
                    </p>

                  </div>

                  <div className="p-6 sm:p-7">

                    <div>

                      <label
                        htmlFor="message"
                        className="text-sm font-black text-slate-700"
                      >
                        Delivery Message
                      </label>

                      <textarea
                        id="message"
                        name="message"
                        rows={6}
                        required
                        placeholder={
                          isRevisionRequested
                            ? "Explain what you changed in this revision..."
                            : "Write a message for the client..."
                        }
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />

                    </div>

                    <div className="mt-7 rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
                      <div>
                        <p className="text-sm font-black text-slate-900">Upload delivery file</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Upload your final or revised work here, then select it below for delivery.
                        </p>
                      </div>
                      <FileUpload projectId={project.id} />
                    </div>

                    <div className="mt-7">

                      <label className="text-sm font-black text-slate-700">
                        Select Final File
                      </label>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Select a file that you have already uploaded to
                        this project.
                      </p>

                      {projectFilesError && (
                        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                          <p className="font-bold">
                            Unable to load project files.
                          </p>
                        </div>
                      )}

                      {!projectFilesError &&
                        (!projectFiles ||
                          projectFiles.length === 0) && (

                          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-5">

                            <div className="flex items-start gap-3">

                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg">
                                📂
                              </div>

                              <div>

                                <p className="font-black text-amber-900">
                                  No project files available
                                </p>

                                <p className="mt-1 text-sm leading-6 text-amber-700">
                                  Upload your final file from the Project
                                  Files section first.
                                </p>

                              </div>

                            </div>

                            <Link
                              href={`/projects/${project.id}/files`}
                              className="mt-4 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
                            >
                              Go to Project Files →
                            </Link>

                          </div>
                        )}

                      {projectFiles &&
                        projectFiles.length > 0 && (

                          <div className="mt-4 space-y-3">

                            {projectFiles.map((file) => {

                              const filePath =
                                `${project.id}/${file.name}`;

                              return (
                                <label
                                  key={file.name}
                                  className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition duration-300 hover:border-blue-300 hover:bg-blue-50/60"
                                >

                                  <input
                                    type="radio"
                                    name="file_path"
                                    value={filePath}
                                    required
                                    className="h-4 w-4 accent-blue-600"
                                  />

                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm transition group-hover:scale-105">
                                    📄
                                  </div>

                                  <div className="min-w-0">

                                    <p className="truncate text-sm font-black text-slate-900">
                                      {file.name}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                      Project file
                                    </p>

                                  </div>

                                </label>
                              );
                            })}

                          </div>
                        )}

                    </div>

                    <button
                      type="submit"
                      disabled={
                        !projectFiles ||
                        projectFiles.length === 0
                      }
                      className="mt-7 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isRevisionRequested
                        ? "Submit Revision →"
                        : "Submit Delivery →"}
                    </button>

                    <p className="mt-3 text-center text-xs text-slate-400">
                      The selected file will be shared securely with the
                      client.
                    </p>

                  </div>

                </form>
              )}

          </div>
        )}

        {/* =========================================================
            CLIENT VIEW
        ========================================================= */}

        {isClient && (
          <div className="space-y-6">

            {/* =========================
                STATUS
            ========================= */}

            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/30">

              <div className="p-6 sm:p-7">

                <div className="flex items-center gap-4">

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 text-2xl">
                    {isApproved
                      ? "✅"
                      : isSubmitted
                      ? "📦"
                      : isRevisionRequested
                      ? "🔄"
                      : "⏳"}
                  </div>

                  <div>

                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Delivery Status
                    </p>

                    <h2 className="mt-1 text-xl font-black text-slate-950">

                      {!hasDelivery &&
                        "Waiting for Delivery"}

                      {isSubmitted &&
                        "Delivery Ready for Review"}

                      {isRevisionRequested &&
                        "Revision Requested"}

                      {isApproved &&
                        "Delivery Approved"}

                    </h2>

                  </div>

                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">

                  {!hasDelivery && (
                    <p className="text-sm leading-6 text-slate-600">
                      Your freelancer has not submitted the final delivery
                      yet.
                    </p>
                  )}

                  {isSubmitted && (
                    <p className="text-sm leading-6 text-slate-600">
                      Your freelancer has submitted the completed work.
                      Please review the delivery below.
                    </p>
                  )}

                  {isRevisionRequested && (
                    <p className="text-sm leading-6 text-slate-600">
                      You requested a revision. The freelancer will submit
                      the updated work here.
                    </p>
                  )}

                  {isApproved && (
                    <p className="text-sm leading-6 text-slate-600">
                      You approved the delivery. This project has been
                      completed successfully.
                    </p>
                  )}

                </div>

              </div>

            </div>

            {/* =========================
                DELIVERY REVIEW
            ========================= */}

            {latestDelivery && (
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/30">

                <div className="border-b border-slate-100 px-6 py-5 sm:px-7">

                  <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                    Client Review
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
                    Final Delivery
                  </h2>

                </div>

                <div className="p-6 sm:p-7">

                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Freelancer Message
                  </p>

                  <div className="mt-3 rounded-2xl bg-slate-50 p-5">

                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                      {latestDelivery.message}
                    </p>

                  </div>

                  {latestDelivery.file_path && (
                    <div className="mt-6">

                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Final File
                      </p>

                      <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">

                        <div className="flex min-w-0 items-center gap-4">

                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                            📄
                          </div>

                          <div className="min-w-0">

                            <p className="truncate text-sm font-black text-slate-900">
                              {latestDelivery.file_name ||
                                latestDelivery.file_path
                                  .split("/")
                                  .pop()}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Final project file
                            </p>

                          </div>

                        </div>

                        {deliveryFileUrl && (
                          <div className="flex shrink-0 gap-2">

                            <a
                              href={deliveryFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
                            >
                              Open
                            </a>

                            <a
                              href={deliveryFileUrl}
                              download={
                                latestDelivery.file_name ||
                                "project-file"
                              }
                              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                            >
                              Download
                            </a>

                          </div>
                        )}

                      </div>

                    </div>
                  )}

                  {/* =========================
                      REVIEW ACTIONS
                  ========================= */}

                  {isSubmitted && (
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">

                      {/* =========================
                          APPROVE DELIVERY
                      ========================= */}

                      <form
                        action={async () => {
                          "use server";

                          // =========================
                          // AUTH
                          // =========================

                          const supabase =
                            await createClient();

                          const {
                            data: { user },
                          } =
                            await supabase.auth.getUser();

                          if (!user) {
                            redirect("/login");
                          }

                          // =========================
                          // VERIFY PROJECT
                          // =========================

                          const {
                            data: projectCheck,
                          } =
                            await supabase
                              .from("projects")
                              .select(`
                                id,
                                client_id,
                                freelancer_id,
                                status
                              `)
                              .eq(
                                "id",
                                project.id
                              )
                              .maybeSingle();

                          if (!projectCheck) {
                            notFound();
                          }

                          if (
                            projectCheck.client_id !==
                            user.id
                          ) {
                            return;
                          }

                          if (
                            projectCheck.status !==
                            "active"
                          ) {
                            return;
                          }

                          // =========================
                          // VERIFY DELIVERY
                          // =========================

                          const {
                            data: deliveryCheck,
                          } =
                            await supabaseAdmin
                              .from(
                                "project_deliveries"
                              )
                              .select(`
                                id,
                                project_id,
                                client_id,
                                freelancer_id,
                                status
                              `)
                              .eq(
                                "id",
                                latestDelivery.id
                              )
                              .eq(
                                "project_id",
                                projectCheck.id
                              )
                              .maybeSingle();

                          if (!deliveryCheck) {
                            return;
                          }

                          if (
                            deliveryCheck.client_id !==
                            user.id
                          ) {
                            return;
                          }

                          if (
                            deliveryCheck.status !==
                            "submitted"
                          ) {
                            return;
                          }

                          // =========================
                          // APPROVE DELIVERY
                          // SERVER-SIDE ADMIN
                          // =========================

                          const {
                            error:
                              deliveryUpdateError,
                          } =
                            await supabaseAdmin
                              .from(
                                "project_deliveries"
                              )
                              .update({
                                status:
                                  "approved",

                                updated_at:
                                  new Date().toISOString(),
                              })
                              .eq(
                                "id",
                                deliveryCheck.id
                              )
                              .eq(
                                "project_id",
                                projectCheck.id
                              )
                              .eq(
                                "client_id",
                                user.id
                              )
                              .eq(
                                "status",
                                "submitted"
                              );

                          if (
                            deliveryUpdateError
                          ) {
                            console.error(
                              "Approval error:",
                              deliveryUpdateError
                            );

                            return;
                          }

                          // Release escrow atomically. The database function verifies that
                          // the authenticated caller is the project client and completes the project.
                          const { error: releaseError } = await supabase
                            .rpc("release_project_payment", { p_project_id: project.id });

                          if (releaseError) {
                            console.error("Escrow release error:", releaseError);
                            return;
                          }

                          // Keep the original request in sync with the completed project.
                          if (project.request_id) {
                            const { error: requestCompletionError } = await supabaseAdmin
                              .from("project_requests")
                              .update({
                                status: "completed",
                                updated_at: new Date().toISOString(),
                              })
                              .eq("id", project.request_id);

                            if (requestCompletionError) {
                              console.error("Request completion update error:", requestCompletionError);
                            }
                          }

                          redirect(
                            `/projects/${project.id}/review`
                          );
                        }}
                      >

                        <button
                          type="submit"
                          className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-green-600/15 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                        >
                          ✓ Approve Delivery
                        </button>

                      </form>

                      {/* =========================
                          REQUEST REVISION
                      ========================= */}

                      <form
                        action={async () => {
                          "use server";

                          // =========================
                          // AUTH
                          // =========================

                          const supabase =
                            await createClient();

                          const {
                            data: { user },
                          } =
                            await supabase.auth.getUser();

                          if (!user) {
                            redirect("/login");
                          }

                          // =========================
                          // VERIFY PROJECT
                          // =========================

                          const {
                            data: projectCheck,
                          } =
                            await supabase
                              .from("projects")
                              .select(`
                                id,
                                client_id,
                                freelancer_id,
                                status
                              `)
                              .eq(
                                "id",
                                project.id
                              )
                              .maybeSingle();

                          if (!projectCheck) {
                            notFound();
                          }

                          if (
                            projectCheck.client_id !==
                            user.id
                          ) {
                            return;
                          }

                          if (
                            projectCheck.status !==
                            "active"
                          ) {
                            return;
                          }

                          // =========================
                          // VERIFY DELIVERY
                          // =========================

                          const {
                            data: deliveryCheck,
                          } =
                            await supabaseAdmin
                              .from(
                                "project_deliveries"
                              )
                              .select(`
                                id,
                                project_id,
                                client_id,
                                freelancer_id,
                                status
                              `)
                              .eq(
                                "id",
                                latestDelivery.id
                              )
                              .eq(
                                "project_id",
                                projectCheck.id
                              )
                              .maybeSingle();

                          if (!deliveryCheck) {
                            return;
                          }

                          if (
                            deliveryCheck.client_id !==
                            user.id
                          ) {
                            return;
                          }

                          if (
                            deliveryCheck.status !==
                            "submitted"
                          ) {
                            return;
                          }

                          // =========================
                          // REQUEST REVISION
                          // SERVER-SIDE ADMIN
                          // =========================

                          const {
                            error:
                              revisionError,
                          } =
                            await supabaseAdmin
                              .from(
                                "project_deliveries"
                              )
                              .update({
                                status:
                                  "revision_requested",

                                updated_at:
                                  new Date().toISOString(),
                              })
                              .eq(
                                "id",
                                deliveryCheck.id
                              )
                              .eq(
                                "project_id",
                                projectCheck.id
                              )
                              .eq(
                                "client_id",
                                user.id
                              )
                              .eq(
                                "status",
                                "submitted"
                              );

                          if (
                            revisionError
                          ) {
                            console.error(
                              "Revision request error:",
                              revisionError
                            );

                            return;
                          }

                          redirect(
                            `/projects/${project.id}/delivery`
                          );
                        }}
                      >

                        <button
                          type="submit"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-600 transition duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-600 hover:shadow-md"
                        >
                          ↻ Request Revision
                        </button>

                      </form>

                    </div>
                  )}

                </div>

              </div>
            )}

            {/* =========================
                NO DELIVERY
            ========================= */}

            {!latestDelivery && (
              <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-200/30">

                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-blue-50 to-violet-50 text-3xl">
                  📦
                </div>

                <h3 className="mt-6 text-xl font-black text-slate-950">
                  No delivery submitted yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  You will be able to review and download the final work
                  once your freelancer submits it.
                </p>

              </div>
            )}

          </div>
        )}

        {/* =========================
            BOTTOM NAVIGATION
        ========================= */}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">

          <Link
            href={`/projects/${project.id}/files`}
            className="group rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600">
              ← Project Files
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

        {/* =========================
            FOOTER
        ========================= */}

        <div className="mt-8 flex flex-col items-center justify-between gap-2 text-xs text-slate-400 sm:flex-row">
          <span>YOUTENT Project Workspace</span>
          <span>Where Talent Meets Opportunity</span>
        </div>

      </section>

    </main>
  );
}