import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

import YoutentLogo from "@/components/YoutentLogo";
type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MessagesPage({ params }: Props) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  // Get project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(`
      id,
      request_id,
      client_id,
      freelancer_id,
      title,
      status
    `)
    .eq("id", id)
    .maybeSingle();

  if (projectError || !project) {
    notFound();
  }

  // Only project members can access messages
  const isClient = project.client_id === user.id;
  const isFreelancer = project.freelancer_id === user.id;

  if (!isClient && !isFreelancer) {
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
            You are not a member of this project.
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

  // Get messages using project_request_id
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select(`
      id,
      sender_id,
      receiver_id,
      project_request_id,
      content,
      created_at
    `)
    .eq("project_request_id", project.request_id)
    .order("created_at", { ascending: true });

  // Send message
  async function sendMessage(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const message = String(formData.get("message") || "").trim();

    if (!message) {
      return;
    }

    // Get project again for security
    const { data: currentProject } = await supabase
      .from("projects")
      .select(`
        id,
        request_id,
        client_id,
        freelancer_id
      `)
      .eq("id", id)
      .maybeSingle();

    if (!currentProject) {
      return;
    }

    const isProjectMember =
      currentProject.client_id === user.id ||
      currentProject.freelancer_id === user.id;

    if (!isProjectMember) {
      return;
    }

    const receiverId =
      currentProject.client_id === user.id
        ? currentProject.freelancer_id
        : currentProject.client_id;

    const { error } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        project_request_id: currentProject.request_id,
        content: message,
      });

    if (error) {
      console.error("Message send error:", error);
      return;
    }

    revalidatePath(`/projects/${id}/messages`);
  }

  const messageCount = messages?.length || 0;

  return (
    <main className="min-h-screen youtent-app-bg text-slate-900">

      {/* Decorative background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-blue-200/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-violet-200/20 blur-3xl" />
      </div>

      {/* Navbar */}
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

      {/* Page */}
      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-12">

        {/* Header */}
        <div className="mb-7">

          <div className="flex flex-wrap items-center gap-3">

            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Project Messages
            </span>

            <span className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-500">
              {messageCount}{" "}
              {messageCount === 1 ? "message" : "messages"}
            </span>

          </div>

          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {project.title}
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
            {isClient
              ? "Chat with your freelancer and keep your project communication in one place."
              : "Chat with your client and keep your project communication in one place."}
          </p>

        </div>

        {/* Chat Container */}
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/40">

          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">

            <div className="flex items-center gap-3">

              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-xl">
                💬

                <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
              </div>

              <div>
                <p className="font-black text-slate-900">
                  Project Chat
                </p>

                <p className="text-xs text-emerald-600">
                  Conversation active
                </p>
              </div>

            </div>

            <div className="hidden rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 sm:block">
              {isClient ? "Client" : "Freelancer"}
            </div>

          </div>

          {/* Messages */}
          <div className="min-h-[500px] space-y-4 bg-gradient-to-b from-slate-50 to-slate-100/70 p-5 sm:p-7">

            {messagesError && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
                <div className="font-bold">
                  Unable to load messages.
                </div>

                <p className="mt-1 text-xs leading-5 text-red-600/80">
                  {messagesError.message}
                </p>
              </div>
            )}

            {!messagesError &&
              (!messages || messages.length === 0) && (
                <div className="flex min-h-[450px] items-center justify-center text-center">

                  <div className="max-w-sm">

                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-white text-3xl shadow-lg shadow-slate-200/70">
                      💬
                    </div>

                    <h2 className="mt-6 text-xl font-black text-slate-950">
                      Start the conversation
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      No messages yet. Send the first message to your{" "}
                      {isClient ? "freelancer" : "client"} and get the
                      conversation started.
                    </p>

                  </div>

                </div>
              )}

            {messages &&
              messages.length > 0 &&
              messages.map((message) => {

                const mine = message.sender_id === user.id;

                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      mine ? "justify-end" : "justify-start"
                    }`}
                  >

                    <div
                      className={`group max-w-[88%] sm:max-w-[75%] ${
                        mine ? "items-end" : "items-start"
                      }`}
                    >

                      <div
                        className={`relative rounded-[20px] px-4 py-3.5 text-sm shadow-sm transition duration-200 sm:px-5 ${
                          mine
                            ? "rounded-br-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-200/50"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                        }`}
                      >

                        <p className="whitespace-pre-wrap leading-6">
                          {message.content}
                        </p>

                        <p
                          className={`mt-2 text-[10px] font-medium ${
                            mine
                              ? "text-blue-100"
                              : "text-slate-400"
                          }`}
                        >
                          {new Date(
                            message.created_at
                          ).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>

                      </div>

                    </div>

                  </div>
                );
              })}

          </div>

          {/* Send Message */}
          <div className="border-t border-slate-100 bg-white p-4 sm:p-5">

            <form
              action={sendMessage}
              className="flex flex-col gap-3 sm:flex-row"
            >

              <div className="relative min-w-0 flex-1">

                <input
                  type="text"
                  name="message"
                  required
                  autoComplete="off"
                  placeholder={`Message your ${
                    isClient ? "freelancer" : "client"
                  }...`}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />

              </div>

              <button
                type="submit"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/25 active:translate-y-0"
              >
                Send
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </button>

            </form>

            <p className="mt-3 text-center text-[11px] text-slate-400">
              Keep project communication clear and professional.
            </p>

          </div>

        </div>

        {/* Bottom Navigation */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">

          <Link
            href={`/projects/${project.id}`}
            className="group rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600">
              ← Project Overview
            </span>
          </Link>

          <Link
            href={`/projects/${project.id}/files`}
            className="group rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
          >
            <span className="text-sm font-bold text-slate-600 group-hover:text-violet-600">
              Project Files →
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