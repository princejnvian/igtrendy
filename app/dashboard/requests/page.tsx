import YoutentLogo from "@/components/YoutentLogo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RequestsPage() {
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
      client_id
    `)
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  const clientIds = [
    ...new Set((requests || []).map((request) => request.client_id)),
  ];

  let clients: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  }[] = [];

  if (clientIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", clientIds);

    clients = data || [];
  }

  const getClient = (clientId: string) =>
    clients.find((client) => client.id === clientId);

  return (
    <main className="min-h-screen youtent-app-bg text-gray-900">

      {/* Navbar */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <YoutentLogo href="/dashboard" />

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Dashboard
            </Link>

            <Link
              href="/creators"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Browse Creators
            </Link>
          </div>

        </div>
      </nav>

      {/* Main */}
      <section className="mx-auto max-w-5xl px-6 py-12">

        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
            Creator Dashboard
          </p>

          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
            Project Requests
          </h1>

          <p className="mt-3 text-gray-600">
            View project requests sent to you by clients.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            Unable to load project requests.
            <p className="mt-1">{error.message}</p>
          </div>
        )}

        {/* No Requests */}
        {!error && (!requests || requests.length === 0) && (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">
              📩
            </div>

            <h2 className="mt-5 text-2xl font-bold">
              No project requests yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-gray-500">
              When clients send you project requests, they will appear here.
            </p>

          </div>
        )}

        {/* Requests */}
        {requests && requests.length > 0 && (
          <div className="space-y-6">

            {requests.map((request) => {

              const client = getClient(request.client_id);

              return (
                <div
                  key={request.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >

                  {/* Header */}
                  <div className="border-b border-gray-100 p-6">

                    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">

                      <div className="flex items-center gap-4">

                        {client?.avatar_url ? (
                          <img
                            src={client.avatar_url}
                            alt={client.full_name || "Client"}
                            className="h-14 w-14 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                            {(client?.full_name || "C")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Project request from
                          </p>

                          <h2 className="mt-1 text-lg font-bold">
                            {client?.full_name || "Client"}
                          </h2>

                          {client?.username && (
                            <p className="text-sm text-gray-500">
                              @{client.username}
                            </p>
                          )}
                        </div>

                      </div>

                      {/* Status */}
                      <span
                        className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${
                          request.status === "pending"
                            ? "bg-yellow-50 text-yellow-700"
                            : request.status === "accepted"
                            ? "bg-green-50 text-green-700"
                            : request.status === "declined"
                            ? "bg-red-50 text-red-700"
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
                          {request.budget
                            ? `₹${Number(request.budget).toLocaleString("en-IN")}`
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

                  </div>

                  {/* Actions */}
                  {request.status === "pending" && (
                    <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 p-6 sm:flex-row sm:justify-end">

                      <form
                        action={`/api/project-requests/${request.id}/decline`}
                        method="post"
                      >
                        <button
                          type="submit"
                          className="w-full rounded-xl border border-red-200 bg-white px-6 py-3 font-semibold text-red-600 transition hover:bg-red-50 sm:w-auto"
                        >
                          Decline
                        </button>
                      </form>

                      <form
                        action={`/api/project-requests/${request.id}/accept`}
                        method="post"
                      >
                        <button
                          type="submit"
                          className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
                        >
                          Accept Project
                        </button>
                      </form>

                    </div>
                  )}

                </div>
              );
            })}

          </div>
        )}

      </section>

    </main>
  );
}