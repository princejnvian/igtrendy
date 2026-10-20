"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import YoutentLogo from "@/components/YoutentLogo";
export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const passwordLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[A-Za-z]/.test(password);

  const strength =
    password.length === 0
      ? 0
      : passwordLength && hasNumber && hasLetter
        ? 100
        : password.length >= 6
          ? 65
          : 30;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!password) {
      setError("Please enter your new password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(
      "Your password has been updated successfully. Redirecting to login..."
    );

    setTimeout(() => {
      router.push("/login");
    }, 1800);
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
                width="27"
                height="27"
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
                  y="11"
                  rx="2"
                />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            {/* Heading */}
            <div className="mb-8">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider text-blue-600">
                Secure Your Account
              </p>

              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Create a new password
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Choose a strong password for your YOUTENT account. Make sure
                you remember it for your next login.
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
              {/* New Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  New Password
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
                        width="18"
                        height="11"
                        x="3"
                        y="11"
                        rx="2"
                      />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-600"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
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
                        <path d="M3 3l18 18" />
                        <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                        <path d="M9.88 4.24A9.77 9.77 0 0 1 12 4c5 0 9 4 10 8a10.8 10.8 0 0 1-2.05 3.73" />
                        <path d="M6.61 6.61A10.8 10.8 0 0 0 2 12c1 4 5 8 10 8a9.77 9.77 0 0 0 4.24-.96" />
                      </svg>
                    ) : (
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
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Password strength */}
                {password && (
                  <div className="mt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        Password strength
                      </span>

                      <span className="text-xs font-bold text-slate-600">
                        {strength === 100
                          ? "Strong"
                          : strength === 65
                            ? "Medium"
                            : "Weak"}
                      </span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-300"
                        style={{ width: `${strength}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Confirm Password
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
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>

                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-600"
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
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
                        <path d="M3 3l18 18" />
                        <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                        <path d="M9.88 4.24A9.77 9.77 0 0 1 12 4c5 0 9 4 10 8a10.8 10.8 0 0 1-2.05 3.73" />
                        <path d="M6.61 6.61A10.8 10.8 0 0 0 2 12c1 4 5 8 10 8a9.77 9.77 0 0 0 4.24-.96" />
                      </svg>
                    ) : (
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
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                {confirmPassword && (
                  <p
                    className={`mt-2 text-xs font-semibold ${
                      password === confirmPassword
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}
                  >
                    {password === confirmPassword
                      ? "✓ Passwords match"
                      : "Passwords do not match"}
                  </p>
                )}
              </div>

              {/* Requirements */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Password requirements
                </p>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div
                    className={`text-xs font-semibold ${
                      passwordLength
                        ? "text-emerald-600"
                        : "text-slate-400"
                    }`}
                  >
                    {passwordLength ? "✓" : "○"} 8+ characters
                  </div>

                  <div
                    className={`text-xs font-semibold ${
                      hasLetter
                        ? "text-emerald-600"
                        : "text-slate-400"
                    }`}
                  >
                    {hasLetter ? "✓" : "○"} At least one letter
                  </div>

                  <div
                    className={`text-xs font-semibold ${
                      hasNumber
                        ? "text-emerald-600"
                        : "text-slate-400"
                    }`}
                  >
                    {hasNumber ? "✓" : "○"} At least one number
                  </div>

                  <div
                    className={`text-xs font-semibold ${
                      password &&
                      confirmPassword &&
                      password === confirmPassword
                        ? "text-emerald-600"
                        : "text-slate-400"
                    }`}
                  >
                    {password &&
                    confirmPassword &&
                    password === confirmPassword
                      ? "✓"
                      : "○"}{" "}
                    Passwords match
                  </div>
                </div>
              </div>

              {/* Submit */}
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
                    Updating Password...
                  </>
                ) : (
                  <>
                    Update Password
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

          {/* Footer */}
          <p className="mt-8 text-center text-xs font-medium text-slate-400">
            YOUTENT — Where Talent Meets Opportunity
          </p>
        </div>
      </section>
    </main>
  );
}