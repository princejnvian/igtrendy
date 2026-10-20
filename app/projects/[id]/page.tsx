import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import YoutentLogo from "@/components/YoutentLogo";
import DeleteCompletedProjectButton from "@/components/DeleteCompletedProjectButton";
type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    payment?: string;
  }>;
};

export default async function ProjectPage({ params, searchParams }: Props) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const paymentSuccess = resolvedSearchParams.payment === "success";

  // Get project
  const { data: project, error } = await supabase
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
      status,
      created_at
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !project) {
    notFound();
  }

  // Only project members can access
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
            You are not allowed to view this project.
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

  // Get payment
  const { data: payment } = await supabase
    .from("payments")
    .select(`
      id,
      amount,
      currency,
      status,
      payment_gateway,
      gateway_payment_id,
      gateway_order_id,
      paid_at,
      created_at
    `)
    .eq("project_id", project.id)
    .maybeSingle();

  const paymentStatus = payment?.status || "pending";

  const statusLabel =
    project.status === "pending_payment"
      ? "Awaiting Payment"
      : project.status === "active"
      ? "Active"
      : project.status === "completed"
      ? "Completed"
      : project.status === "cancelled"
      ? "Cancelled"
      : project.status;

  const statusClasses =
    project.status === "pending_payment"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : project.status === "active"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : project.status === "completed"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : project.status === "cancelled"
      ? "bg-red-50 text-red-700 border-red-100"
      : "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <main className="min-h-screen youtent-app-bg text-slate-900">

      {/* Decorative background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-blue-200/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-violet-200/20 blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">

          <YoutentLogo href="/dashboard" />

          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">
              ←
            </span>
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Main */}
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">

        {paymentSuccess && paymentStatus === "paid" && (
          <div className="mb-6 flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-black text-emerald-700">
              ✓
            </div>
            <div>
              <p className="font-black text-emerald-900">Payment successful</p>
              <p className="mt-1 text-sm text-emerald-700">
                Your payment has been verified and the project is now active.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Project Workspace
            </span>

            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold ${statusClasses}`}
            >
              <span className="text-[10px]">●</span>
              {statusLabel}
            </span>
          </div>

          <h1 className="mt-5 max-w-4xl text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {project.title}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
            {isClient
              ? "Manage your project, communicate with your freelancer and track everything from one workspace."
              : "Manage your project, communicate with your client and keep your work organized from one workspace."}
          </p>
        </div>

        {/* Main Workspace Card */}
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/40">

          {/* Project overview */}
          <div className="border-b border-slate-100 p-6 sm:p-8 lg:p-10">

            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">

              <div className="max-w-3xl">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
                  Project Overview
                </p>

                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Project Description
                </h2>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-500 sm:text-base">
                  {project.description}
                </p>
              </div>

              <div className="shrink-0 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 lg:min-w-[180px]">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Your Role
                </p>

                <p className="mt-1 text-lg font-black text-slate-900">
                  {isClient ? "Client" : "Freelancer"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {isClient
                    ? "Project owner"
                    : "Project professional"}
                </p>
              </div>

            </div>
          </div>

          {/* Details */}
          <div className="grid gap-4 border-b border-slate-100 p-6 sm:grid-cols-3 sm:p-8">

            {/* Budget */}
            <div className="group rounded-2xl border border-slate-100 bg-slate-50/70 p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-100 hover:bg-blue-50/40 hover:shadow-lg hover:shadow-blue-100/30">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Budget
                </p>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                  ₹
                </div>
              </div>

              <p className="mt-4 text-2xl font-black tracking-tight text-slate-950">
                {project.budget !== null
                  ? `₹${Number(project.budget).toLocaleString("en-IN")}`
                  : "Not specified"}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Total project value
              </p>
            </div>

            {/* Deadline */}
            <div className="group rounded-2xl border border-slate-100 bg-slate-50/70 p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-100 hover:bg-violet-50/40 hover:shadow-lg hover:shadow-violet-100/30">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Deadline
                </p>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                  📅
                </div>
              </div>

              <p className="mt-4 text-xl font-black tracking-tight text-slate-950">
                {project.deadline
                  ? new Date(project.deadline).toLocaleDateString(
                      "en-IN",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    )
                  : "Not specified"}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Project deadline
              </p>
            </div>

            {/* Role */}
            <div className="group rounded-2xl border border-slate-100 bg-slate-50/70 p-5 transition duration-300 hover:-translate-y-1 hover:border-emerald-100 hover:bg-emerald-50/40 hover:shadow-lg hover:shadow-emerald-100/30">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Account Role
                </p>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                  👤
                </div>
              </div>

              <p className="mt-4 text-xl font-black tracking-tight text-slate-950">
                {isClient ? "Client" : "Freelancer"}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Your role in this project
              </p>
            </div>

          </div>

          {/* Payment */}
          <div className="border-b border-slate-100 p-6 sm:p-8 lg:p-10">

            <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl shadow-slate-300/30 sm:p-8">

              <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">

                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg">
                      💳
                    </span>

                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-300">
                      Secure Payment
                    </p>
                  </div>

                  <h2 className="mt-4 text-2xl font-black sm:text-3xl">
                    Project Payment
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                    {project.budget !== null
                      ? `Total project amount: ₹${Number(
                          project.budget
                        ).toLocaleString("en-IN")}`
                      : "No project budget specified."}
                  </p>
                </div>

                {/* CLIENT */}
                {isClient && project.budget !== null && (
                  <div className="lg:text-right">

                    {paymentStatus === "paid" ? (
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-400/10 px-4 py-2.5 text-sm font-black text-emerald-300 ring-1 ring-emerald-400/20">
                          <span>✓</span>
                          Payment Paid
                        </div>

                        {payment?.paid_at && (
                          <p className="mt-2 text-xs text-slate-400">
                            Paid on{" "}
                            {new Date(
                              payment.paid_at
                            ).toLocaleDateString("en-IN")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Link
                        href={`/projects/${project.id}/payment`}
                        className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:bg-blue-50"
                      >
                        Pay Now
                        <span className="transition-transform group-hover:translate-x-1">
                          →
                        </span>
                      </Link>
                    )}

                  </div>
                )}

                {/* FREELANCER */}
                {!isClient && (
                  <div className="lg:text-right">

                    {paymentStatus === "paid" ? (
                      <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-400/10 px-4 py-2.5 text-sm font-black text-emerald-300 ring-1 ring-emerald-400/20">
                        <span>✓</span>
                        Client Paid
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-xl bg-amber-400/10 px-4 py-2.5 text-sm font-black text-amber-300 ring-1 ring-amber-400/20">
                        <span>●</span>
                        Payment Pending
                      </div>
                    )}

                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Workspace */}
          <div className="bg-slate-50/70 p-6 sm:p-8 lg:p-10">

            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
                Collaboration
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Project Workspace
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Everything you need to communicate, share files and
                complete your project in one place.
              </p>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-3">

              {/* Messages */}
              <Link
                href={`/projects/${project.id}/messages`}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/40"
              >
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-50 transition duration-300 group-hover:scale-150" />

                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl transition duration-300 group-hover:scale-110">
                    💬
                  </div>

                  <h3 className="mt-5 text-lg font-black text-slate-950">
                    Messages
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Chat with your{" "}
                    {isClient ? "freelancer" : "client"} and keep
                    communication organized.
                  </p>

                  <div className="mt-5 flex items-center gap-2 text-sm font-black text-blue-600">
                    Open Messages
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </div>
              </Link>

              {/* Files */}
              {paymentStatus === "paid" ? (
                <Link
                  href={`/projects/${project.id}/files`}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/40"
                >
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-50 transition duration-300 group-hover:scale-150" />

                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-xl transition duration-300 group-hover:scale-110">
                      📁
                    </div>

                    <h3 className="mt-5 text-lg font-black text-slate-950">
                      Files
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Share project files, documents and creative assets
                      securely.
                    </p>

                    <div className="mt-5 flex items-center gap-2 text-sm font-black text-violet-600">
                      Open Files
                      <span className="transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-violet-50/60 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                    🔒
                  </div>
                  <h3 className="mt-5 text-lg font-black text-slate-950">Files</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Project files will become available after the client completes payment.
                  </p>
                  <div className="mt-5 text-sm font-black text-violet-600">
                    Available after payment
                  </div>
                </div>
              )}

              {/* Delivery */}
              {paymentStatus === "paid" ? (
                <Link
                  href={`/projects/${project.id}/delivery`}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-100/40"
                >
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-50 transition duration-300 group-hover:scale-150" />

                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl transition duration-300 group-hover:scale-110">
                      🚀
                    </div>

                    <h3 className="mt-5 text-lg font-black text-slate-950">
                      Delivery
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Submit, review and manage your project delivery.
                    </p>

                    <div className="mt-5 flex items-center gap-2 text-sm font-black text-emerald-600">
                      Open Delivery
                      <span className="transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                    🔒
                  </div>
                  <h3 className="mt-5 text-lg font-black text-slate-950">Delivery</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Delivery tools will become available after the client completes payment.
                  </p>
                  <div className="mt-5 text-sm font-black text-emerald-600">
                    Available after payment
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {project.status === "completed" && (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-black text-emerald-900">Project completed</p><p className="mt-1 text-xs text-emerald-700">Delivery accepted. The release workflow has completed.</p></div>
            <div className="flex gap-2">
              {isClient && <Link href={`/projects/${project.id}/review`} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700">Leave Review</Link>}
              {!isClient && <Link href="/wallet" className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white hover:bg-blue-600">Open Wallet</Link>}
              <DeleteCompletedProjectButton projectId={project.id} />
            </div>
          </div>
        )}

        {/* Bottom note */}
        <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-400 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            YOUTENT Project Workspace
          </span>

          <span>
            Where Talent Meets Opportunity
          </span>
        </div>

      </section>
    </main>
  );
}