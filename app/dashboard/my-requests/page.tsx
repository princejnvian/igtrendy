import YoutentLogo from "@/components/YoutentLogo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MyRequestsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  const creatorIds = [
    ...new Set(
      (requests || []).map((request) => request.creator_id)
    ),
  ];

  let creators: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  }[] = [];

  if (creatorIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", creatorIds);

    creators = data || [];
  }

  // Get projects created from these requests
  const requestIds = (requests || []).map((request) => request.id);

  let projects: {
    id: string;
    request_id: string;
  }[] = [];

  if (requestIds.length > 0) {
    const { data: projectData } = await supabase
      .from("projects")
      .select("id, request_id")
      .in("request_id", requestIds);

    projects = projectData || [];
  }

  const getCreator = (creatorId: string) =>
    creators.find((creator) => creator.id === creatorId);

  const getProject = (requestId: string) =>
    projects.find((project) => project.request_id === requestId);

  return (
    <main className="min-h-screen youtent-app-bg text-gray-900">

      {/* Navbar */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <YoutentLogo href="/dashboard" />

          <Link
            href="/dashboard"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            ← Dashboard
          </Link>

        </div>
      </nav>

      {/* Main */}
      <section className="mx-auto max-w-5xl px-6 py-12">

        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
            Client Dashboard
          </p>

          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
            My Project Requests
          </h1>

          <p className="mt-3 text-gray-600">
            Track the project requests you have sent to creators.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            Unable to load your requests.
            <p className="mt-1">{error.message}</p>
          </div>
        )}

        {!error && (!requests || requests.length === 0) && (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">
              📋
            </div>

            <h2 className="mt-5 text-2xl font-bold">
              No project requests yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-gray-500">
              Requests you send to creators will appear here.
            </p>

            <Link
              href="/creators"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Browse Creators
            </Link>

          </div>
        )}

        {requests && requests.length > 0 && (
          <div className="space-y-6">

            {requests.map((request) => {

              const creator = getCreator(request.creator_id);
              const project = getProject(request.id);

              return (
                <div
                  key={request.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >

                  {/* Creator */}
                  <div className="border-b border-gray-100 p-6">

                    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

                      <div className="flex items-center gap-4">

                        {creator?.avatar_url ? (
                          <img
                            src={creator.avatar_url}
                            alt={creator.full_name || "Creator"}
                            className="h-14 w-14 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                            {(creator?.full_name || "C")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Creator
                          </p>

                          <h2 className="mt-1 text-lg font-bold">
                            {creator?.full_name || "Creator"}
                          </h2>

                          {creator?.username && (
                            <p className="text-sm text-gray-500">
                              @{creator.username}
                            </p>
                          )}
                        </div>

                      </div>

                      <span
                        className={`w-fit rounded-full px-4 py-2 text-xs font-bold ${
                          request.status === "pending"
                            ? "bg-yellow-50 text-yellow-700"
                            : request.status === "accepted"
                            ? "bg-green-50 text-green-700"
                            : request.status === "declined"
                            ? "bg-red-50 text-red-700"
                            : request.status === "completed"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {request.status.charAt(0).toUpperCase() +
                          request.status.slice(1)}
                      </span>

                    </div>

                  </div>

                  {/* Details */}
                  <div className="space-y-6 p-6">

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Project
                      </p>

                      <h3 className="mt-1 text-2xl font-bold">
                        {request.project_title}
                      </h3>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        Description
                      </p>

                      <p className="mt-2 whitespace-pre-wrap leading-7 text-gray-600">
                        {request.description}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">

                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-xs font-semibold text-gray-400">
                          Service
                        </p>

                        <p className="mt-1 font-semibold">
                          {request.service || "Not specified"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-xs font-semibold text-gray-400">
                          Budget
                        </p>

                        <p className="mt-1 font-semibold">
                          {request.budget !== null
                            ? `₹${Number(
                                request.budget
                              ).toLocaleString("en-IN")}`
                            : "Not specified"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-xs font-semibold text-gray-400">
                          Deadline
                        </p>

                        <p className="mt-1 font-semibold">
                          {request.deadline || "Not specified"}
                        </p>
                      </div>

                    </div>

                    {/* ACTION */}
                    {request.status === "accepted" && project && (
                      <div className="border-t border-gray-100 pt-5">

                        <Link
                          href={`/projects/${project.id}`}
                          className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
                        >
                          Open Project →
                        </Link>

                      </div>
                    )}

                    {request.status === "accepted" && !project && (
                      <div className="border-t border-yellow-100 pt-5">
                        <div className="rounded-xl bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                          Your request has been accepted, but the project
                          workspace has not been created yet.
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Footer */}
                  <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">

                    <p className="text-xs text-gray-500">
                      Request sent{" "}
                      {new Date(
                        request.created_at
                      ).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>

                  </div>

                </div>
              );
            })}

          </div>
        )}

      </section>

    </main>
  );
}