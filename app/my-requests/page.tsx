import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarketplaceHeader from "@/components/MarketplaceHeader";

export default async function MyRequestsPage() {
  const supabase = await createClient();

  // ================= AUTH CHECK =================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("type", "request_status")
    .is("read_at", null);

  // ================= GET REQUESTS =================

  const { data: requests, error } = await supabase
    .from("project_requests")
    .select(`
      id,
      project_title,
      description,
      service,
      budget,
      deadline,
      status,
      created_at,
      creator_id
    `)
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  // ================= GET CREATOR IDS =================

  const creatorIds = [
    ...new Set(
      (requests || []).map(
        (request) => request.creator_id
      )
    ),
  ];

  // ================= GET CREATOR PROFILES =================

  let creators: Record<
    string,
    {
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
    }
  > = {};

  if (creatorIds.length > 0) {
    const { data: creatorProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", creatorIds);

    creators = Object.fromEntries(
      (creatorProfiles || []).map((creator) => [
        creator.id,
        creator,
      ])
    );
  }

  // ================= GET PROJECTS =================

  const requestIds = (requests || []).map(
    (request) => request.id
  );

  let projects: Record<
    string,
    {
      id: string;
      request_id: string;
    }
  > = {};

  if (requestIds.length > 0) {
    const { data: projectData } = await supabase
      .from("projects")
      .select("id, request_id")
      .in("request_id", requestIds);

    projects = Object.fromEntries(
      (projectData || []).map((project) => [
        project.request_id,
        project,
      ])
    );
  }

  // ================= STATS =================

  const totalRequests = requests?.length || 0;

  const pendingRequests =
    requests?.filter(
      (request) => request.status === "pending"
    ).length || 0;

  const acceptedRequests =
    requests?.filter(
      (request) => request.status === "accepted"
    ).length || 0;

  const completedRequests =
    requests?.filter(
      (request) => request.status === "completed"
    ).length || 0;

  return (
    <main className="my-requests-page youtent-app-bg min-h-screen text-slate-900">

      <MarketplaceHeader accountType="client" />

      {/* ================= HERO ================= */}

      <section className="relative overflow-hidden border-b border-slate-200 bg-white">

        <div className="pointer-events-none absolute -left-32 -top-32 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />

        <div className="pointer-events-none absolute -right-32 -top-20 h-72 w-72 rounded-full bg-indigo-200/25 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-7 sm:px-6 sm:py-9 lg:px-8">

          <div className="max-w-3xl">

            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-blue-700">

              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />

              Client Workspace

            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">

              My Project{" "}

              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Requests.
              </span>

            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Track the project requests you have sent to creators
              and manage your ongoing work.
            </p>

          </div>

        </div>

      </section>

      {/* ================= MAIN ================= */}

      <section className="mx-auto max-w-7xl px-5 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ================= STATS ================= */}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          {/* Total */}

          <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">

            <div className="flex items-start justify-between">

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Requests
                </p>

                <p className="mt-1 text-2xl font-black text-slate-950">
                  {totalRequests}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-lg">
                📋
              </div>

            </div>

          </div>

          {/* Pending */}

          <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">

            <div className="flex items-start justify-between">

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pending
                </p>

                <p className="mt-1 text-2xl font-black text-slate-950">
                  {pendingRequests}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-lg">
                ⏳
              </div>

            </div>

          </div>

          {/* Accepted */}

          <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">

            <div className="flex items-start justify-between">

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Accepted
                </p>

                <p className="mt-1 text-2xl font-black text-slate-950">
                  {acceptedRequests}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-lg">
                ✓
              </div>

            </div>

          </div>

          {/* Completed */}

          <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">

            <div className="flex items-start justify-between">

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Completed
                </p>

                <p className="mt-1 text-2xl font-black text-slate-950">
                  {completedRequests}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-lg">
                ✓
              </div>

            </div>

          </div>

        </div>

        {/* ================= ERROR ================= */}

        {error && (

          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">

            <p className="font-bold">
              Unable to load your project requests.
            </p>

            <p className="mt-1 text-red-600">
              Please refresh the page and try again.
            </p>

          </div>

        )}

        {/* ================= EMPTY STATE ================= */}

        {!requests || requests.length === 0 ? (

          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm sm:py-20">

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100/40 blur-3xl" />

            <div className="relative">

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-3xl">
                📋
              </div>

              <h2 className="mt-6 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                No project requests yet
              </h2>

              <p className="mx-auto mt-3 max-w-md leading-7 text-slate-500">
                When you hire a creator, your project requests
                will appear here.
              </p>

              <Link
                href="/creators"
                className="mt-7 inline-flex items-center rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl"
              >
                Browse Creators
                <span className="ml-2">
                  →
                </span>
              </Link>

            </div>

          </div>

        ) : (

          /* ================= REQUEST LIST ================= */

          <div className="space-y-6">

            {requests.map((request) => {

              const creator =
                creators[request.creator_id];

              const project =
                projects[request.id];

              const creatorName =
                creator?.full_name || "Creator";

              const initial =
                creatorName
                  .charAt(0)
                  .toUpperCase();

              const statusLabel =
                request.status === "pending"
                  ? "Pending"
                  : request.status === "accepted"
                  ? "Accepted"
                  : request.status === "declined"
                  ? "Declined"
                  : request.status === "completed"
                  ? "Completed"
                  : "Cancelled";

              const statusClass =
                request.status === "pending"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : request.status === "accepted"
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : request.status === "declined"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : request.status === "completed"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-100 text-slate-600";

              const formattedDate =
                request.created_at
                  ? new Date(
                      request.created_at
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    )
                  : null;

              return (

                <article
                  key={request.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-lg"
                >

                  {/* ================= CARD HEADER ================= */}

                  <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 p-4 sm:p-5">

                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                      {/* Creator */}

                      <div className="flex items-center gap-4">

                        {creator?.avatar_url ? (

                          <img
                            src={creator.avatar_url}
                            alt={creatorName}
                            className="h-12 w-12 rounded-xl object-cover ring-2 ring-white shadow-sm"
                          />

                        ) : (

                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xl font-black text-white shadow-lg shadow-blue-600/20">
                            {initial}
                          </div>

                        )}

                        <div className="min-w-0">

                          <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                            Creator
                          </p>

                          <h2 className="mt-1 truncate text-lg font-black text-slate-950">
                            {creatorName}
                          </h2>

                          {creator?.username && (
                            <p className="text-sm text-slate-500">
                              @{creator.username}
                            </p>
                          )}

                        </div>

                      </div>

                      {/* Status */}

                      <div className="flex items-center gap-3">

                        <span
                          className={`inline-flex w-fit rounded-full border px-3.5 py-1.5 text-xs font-black ${statusClass}`}
                        >
                          {statusLabel}
                        </span>

                        {formattedDate && (
                          <span className="hidden text-xs font-medium text-slate-400 sm:inline">
                            {formattedDate}
                          </span>
                        )}

                      </div>

                    </div>

                  </div>

                  {/* ================= CARD BODY ================= */}

                  <div className="space-y-4 p-4 sm:p-5">

                    {/* Project */}

                    <div>

                      <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-600">
                        Project
                      </p>

                      <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                        {request.project_title}
                      </h3>

                    </div>

                    {/* Description */}

                    <div>

                      <p className="text-sm font-bold text-slate-800">
                        Description
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600 line-clamp-3">
                        {request.description ||
                          "No description provided."}
                      </p>

                    </div>

                    {/* ================= DETAILS ================= */}

                    <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">

                      {/* Service */}

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Service
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {request.service ||
                            "Not specified"}
                        </p>

                      </div>

                      {/* Budget */}

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Budget
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {request.budget
                            ? `₹${Number(
                                request.budget
                              ).toLocaleString(
                                "en-IN"
                              )}`
                            : "Not specified"}
                        </p>

                      </div>

                      {/* Deadline */}

                      <div className="rounded-xl bg-slate-50 p-3">

                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Deadline
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {request.deadline ||
                            "Not specified"}
                        </p>

                      </div>

                    </div>

                    {/* ================= ACCEPTED ================= */}

                    {request.status === "accepted" && (

                      <div className="border-t border-slate-100 pt-4">

                        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">

                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                            <div>

                              <p className="font-black text-blue-950">
                                Your request has been accepted
                              </p>

                              <p className="mt-1 text-sm text-blue-700">
                                Your project workspace is ready.
                              </p>

                            </div>

                            {project ? (

                              <Link
                                href={`/projects/${project.id}`}
                                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md"
                              >
                                Open Project
                                <span className="ml-2">
                                  →
                                </span>
                              </Link>

                            ) : (

                              <span className="text-sm font-bold text-slate-500">
                                Creating project...
                              </span>

                            )}

                          </div>

                        </div>

                      </div>

                    )}

                    {/* ================= DECLINED ================= */}

                    {request.status === "declined" && (

                      <div className="border-t border-slate-100 pt-4">

                        <div className="rounded-2xl border border-red-100 bg-red-50/60 p-5">

                          <p className="font-bold text-red-800">
                            This request was declined by the creator.
                          </p>

                          <p className="mt-1 text-sm text-red-600">
                            You can browse other creators and send a new request.
                          </p>

                        </div>

                      </div>

                    )}

                    {/* ================= COMPLETED ================= */}

                    {request.status === "completed" && project && (

                      <div className="border-t border-slate-100 pt-4">

                        <Link
                          href={`/projects/${project.id}`}
                          className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 transition duration-200 hover:bg-emerald-50"
                        >

                          <div>

                            <p className="font-bold text-emerald-800">
                              Project completed
                            </p>

                            <p className="mt-1 text-sm text-emerald-600">
                              View your completed project.
                            </p>

                          </div>

                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white font-bold text-emerald-700 shadow-sm">
                            →
                          </span>

                        </Link>

                      </div>

                    )}

                    {/* ================= CREATOR PROFILE ================= */}

                    {creator?.username && (

                      <div className="border-t border-slate-100 pt-5">

                        <Link
                          href={`/creators/${creator.username}`}
                          className="inline-flex items-center text-sm font-bold text-blue-600 transition hover:text-blue-700"
                        >
                          View Creator Profile
                          <span className="ml-2">
                            →
                          </span>
                        </Link>

                      </div>

                    )}

                  </div>

                </article>

              );
            })}

          </div>

        )}

      </section>

      {/* ================= FOOTER ================= */}

      <footer className="mt-6 border-t border-slate-200 bg-white">

        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">

          <p>
            © {new Date().getFullYear()} YOUTENT. All rights reserved.
          </p>

          <p className="font-medium text-slate-500">
            Where Talent Meets Opportunity
          </p>

        </div>

      </footer>

    </main>
  );
}