"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

import YoutentLogo from "@/components/YoutentLogo";
export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(
      "If an account exists with this email, a password reset link has been sent. Please check your inbox."
    );
  }

  return (
    <main className="min-h-screen youtent-app-bg text-slate-900">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <YoutentLogo href="/" />

          <Link
            href="/login"
            className="text-sm font-semibold text-slate-600 transition hover:text-blue-600"
          >
            Back to Login
          </Link>
        </div>
      </nav>

      {/* Main */}
      <section className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-900/10 sm:p-10">
            {/* Icon */}
            <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-600/20">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect
                  width="18"
                  height="11"
                  x="3"
                  y="5"
                  rx="2"
                />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </div>

            {/* Heading */}
            <div className="mb-8">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider text-blue-600">
                Account Recovery
              </p>

              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Forgot your password?
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                No worries. Enter the email address associated with your
                account and we&apos;ll send you a secure link to reset your
                password.
              </p>
            </div>

            {/* Success */}
            {success && (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                  </div>

                  <p className="text-sm leading-6 text-emerald-700">
                    {success}
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    !
                  </div>

                  <p className="text-sm leading-6 text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Email Address
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        width="20"
                        height="16"
                        x="2"
                        y="4"
                        rx="2"
                      />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-sm font-bold text-white shadow-xl shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-600/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-30"
                      />
                      <path
                        d="M21 12a9 9 0 0 0-9-9"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    Sending Reset Link...
                  </>
                ) : (
                  <>
                    Send Reset Link
                    <svg
                      className="transition-transform duration-300 group-hover:translate-x-1"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Login */}
            <div className="mt-8 border-t border-slate-100 pt-7 text-center">
              <p className="text-sm text-slate-500">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="font-bold text-blue-600 transition hover:text-indigo-600"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Footer text */}
          <p className="mt-8 text-center text-xs font-medium text-slate-400">
            YOUTENT — Where Talent Meets Opportunity
          </p>
        </div>
      </section>
    </main>
  );
}