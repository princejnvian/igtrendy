"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

import YoutentLogo from "@/components/YoutentLogo";
export default function SignupPage() {
  const supabase = createClient();

  const [accountType, setAccountType] = useState<"client" | "freelancer">(
    "client"
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const freelancerCategories = [
    "Graphics & Design",
    "Video & Animation",
    "Writing & Translation",
    "Music & Audio",
    "Programming & Tech",
    "Digital Marketing",
    "AI Services",
    "Photography",
  ];

  function toggleCategory(category: string) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : current.length >= 3
          ? current
          : [...current, category]
    );
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!agree) {
      setError("Please accept the Terms of Service and Privacy Policy.");
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

    if (accountType === "freelancer" && selectedCategories.length === 0) {
      setError("Please choose at least one service category.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          account_type: accountType,
          categories: accountType === "freelancer" ? selectedCategories : [],
          primary_category: accountType === "freelancer" ? selectedCategories[0] || "" : "",
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      setSuccess(
        "Account created successfully! Please check your email to verify your account."
      );
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen youtent-app-bg text-slate-900">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="relative z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
          {/* Logo */}
          <YoutentLogo href="/" />

          {/* Login */}
          <p className="text-sm text-slate-500">
            <span className="hidden sm:inline">
              Already have an account?{" "}
            </span>

            <Link
              href="/login"
              className="font-bold text-blue-600 transition hover:text-blue-700"
            >
              Log in
            </Link>
          </p>
        </div>
      </nav>

      {/* Main */}
      <section className="relative z-10 px-5 py-8 sm:px-6 sm:py-12 lg:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="grid overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10 md:grid-cols-2">

            {/* Left Panel */}
            <div className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-10 text-white md:flex md:min-h-[760px] md:flex-col md:justify-between lg:p-12">

              {/* Decorative circles */}
              <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full border border-white/10 bg-white/5" />
              <div className="absolute -bottom-32 -left-28 h-80 w-80 rounded-full border border-white/10 bg-white/5" />
              <div className="absolute right-16 top-1/2 h-24 w-24 rounded-full border border-white/10 bg-white/5" />

              {/* Top */}
              <div className="relative">
                <YoutentLogo href="/" size="lg" lightWordmark />

                {/* Hero */}
                <div className="mt-20">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-100 backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-300" />
                    Join YOUTENT
                  </div>

                  <h1 className="text-4xl font-black leading-[1.08] tracking-tight lg:text-5xl">
                    Build.
                    <br />
                    Create.
                    <br />
                    <span className="text-blue-200">Grow.</span>
                  </h1>

                  <p className="mt-6 max-w-sm text-base leading-7 text-blue-100 lg:text-lg">
                    Join a growing creative community and turn skills,
                    ideas, and opportunities into meaningful projects.
                  </p>
                </div>
              </div>

              {/* Benefits */}
              <div className="relative space-y-5">
                <Benefit
                  title="Find opportunities"
                  description="Connect with creators and clients."
                />

                <Benefit
                  title="Showcase your skills"
                  description="Build your professional presence."
                />

                <Benefit
                  title="Grow your career"
                  description="Turn your creative skills into opportunities."
                />
              </div>
            </div>

            {/* Right Panel */}
            <div className="p-7 sm:p-10 lg:p-12">
              <div className="mx-auto max-w-md">

                {/* Heading */}
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    Get started
                  </div>

                  <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                    Create your account
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Join YOUTENT and start creating opportunities.
                  </p>
                </div>

                {/* Account Type */}
                <div className="mt-7">
                  <label className="text-sm font-bold text-slate-800">
                    I want to
                  </label>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {/* Client */}
                    <button
                      type="button"
                      onClick={() => setAccountType("client")}
                      className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition duration-200 ${
                        accountType === "client"
                          ? "border-blue-500 bg-blue-50/70 shadow-sm ring-4 ring-blue-500/10"
                          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                      }`}
                    >
                      {accountType === "client" && (
                        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">
                          ✓
                        </div>
                      )}

                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
                          accountType === "client"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path d="M20 21a8 8 0 0 0-16 0" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>

                      <p className="mt-3 text-sm font-bold text-slate-900">
                        Hire creators
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        I need creative services.
                      </p>
                    </button>

                    {/* Freelancer */}
                    <button
                      type="button"
                      onClick={() => setAccountType("freelancer")}
                      className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition duration-200 ${
                        accountType === "freelancer"
                          ? "border-blue-500 bg-blue-50/70 shadow-sm ring-4 ring-blue-500/10"
                          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                      }`}
                    >
                      {accountType === "freelancer" && (
                        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">
                          ✓
                        </div>
                      )}

                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
                          accountType === "freelancer"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path d="M12 3v18" />
                          <path d="M17 8c0-2-2.2-3-5-3s-5 1-5 3 2.2 3 5 3 5 1 5 3-2.2 3-5 3-5-1-5-3" />
                        </svg>
                      </div>

                      <p className="mt-3 text-sm font-bold text-slate-900">
                        Offer services
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        I want to sell my skills.
                      </p>
                    </button>
                  </div>
                </div>

                {accountType === "freelancer" && (
                  <div className="mt-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-violet-50/70 p-5 shadow-sm">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-blue-600">Your services</p>
                        <p className="mt-1 text-sm font-black text-slate-900">Choose your marketplace categories</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Pick up to 3. You can add more details and skills after signup.</p>
                      </div>
                      <span className="text-xs font-black text-blue-600">{selectedCategories.length}/3</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {freelancerCategories.map((category) => {
                        const selected = selectedCategories.includes(category);
                        return (
                          <button key={category} type="button" onClick={() => toggleCategory(category)} className={`rounded-xl border px-3 py-3 text-left text-xs font-bold transition ${selected ? "border-blue-500 bg-blue-600 text-white shadow-md" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"}`}>
                            {selected ? "✓ " : ""}{category}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Form */}
                <form
                  onSubmit={handleSignup}
                  className="mt-6 space-y-5"
                >
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="fullName"
                      className="mb-2 block text-sm font-bold text-slate-800"
                    >
                      Full Name
                    </label>

                    <div className="relative">
                      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path d="M20 21a8 8 0 0 0-16 0" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>

                      <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        autoComplete="name"
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-bold text-slate-800"
                    >
                      Email Address
                    </label>

                    <div className="relative">
                      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <rect
                            x="3"
                            y="5"
                            width="18"
                            height="14"
                            rx="2"
                          />
                          <path d="m3 7 9 6 9-6" />
                        </svg>
                      </div>

                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-bold text-slate-800"
                    >
                      Password
                    </label>

                    <div className="relative">
                      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <rect
                            x="4"
                            y="10"
                            width="16"
                            height="10"
                            rx="2"
                          />
                          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                        </svg>
                      </div>

                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-20 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg px-1 text-xs font-bold text-slate-500 transition hover:text-blue-600"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <div
                        className={`h-1 flex-1 rounded-full ${
                          password.length === 0
                            ? "bg-slate-200"
                            : password.length < 8
                              ? "bg-red-300"
                              : password.length < 12
                                ? "bg-yellow-300"
                                : "bg-emerald-400"
                        }`}
                      />

                      <p className="text-xs text-slate-400">
                        Minimum 8 characters
                      </p>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-2 block text-sm font-bold text-slate-800"
                    >
                      Confirm Password
                    </label>

                    <div className="relative">
                      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <rect
                            x="4"
                            y="10"
                            width="16"
                            height="10"
                            rx="2"
                          />
                          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                        </svg>
                      </div>

                      <input
                        id="confirmPassword"
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        value={confirmPassword}
                        onChange={(e) =>
                          setConfirmPassword(e.target.value)
                        }
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-20 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(
                            !showConfirmPassword
                          )
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg px-1 text-xs font-bold text-slate-500 transition hover:text-blue-600"
                      >
                        {showConfirmPassword ? "Hide" : "Show"}
                      </button>
                    </div>

                    {confirmPassword.length > 0 && (
                      <p
                        className={`mt-2 text-xs font-medium ${
                          password === confirmPassword
                            ? "text-emerald-600"
                            : "text-red-500"
                        }`}
                      >
                        {password === confirmPassword
                          ? "Passwords match"
                          : "Passwords do not match"}
                      </p>
                    )}
                  </div>

                  {/* Terms */}
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={(e) =>
                        setAgree(e.target.checked)
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />

                    <span className="text-xs leading-5 text-slate-500">
                      I agree to YOUTENT&apos;s{" "}
                      <Link
                        href="/terms"
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-black">
                        !
                      </div>

                      <p className="leading-5">{error}</p>
                    </div>
                  )}

                  {/* Success */}
                  {success && (
                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-700">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black">
                        ✓
                      </div>

                      <p className="leading-5">{success}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/25 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          Create Account
                          <svg
                            className="h-4 w-4 transition duration-300 group-hover:translate-x-1"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M5 12h14" />
                            <path d="m13 6 6 6-6 6" />
                          </svg>
                        </>
                      )}
                    </span>

                    <div className="absolute inset-0 -translate-x-full bg-white/10 transition duration-700 group-hover:translate-x-full" />
                  </button>
                </form>

                {/* Login */}
                <p className="mt-7 text-center text-sm text-slate-500">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-bold text-blue-600 transition hover:text-blue-700 hover:underline"
                  >
                    Log in
                  </Link>
                </p>

                {/* Tagline */}
                <div className="mt-8 border-t border-slate-100 pt-5 text-center">
                  <p className="text-xs font-medium tracking-wide text-slate-400">
                    Where Talent Meets Opportunity
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Benefit({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-black text-white backdrop-blur-sm">
        ✓
      </div>

      <div>
        <p className="font-bold">{title}</p>

        <p className="mt-1 text-sm leading-6 text-blue-100">
          {description}
        </p>
      </div>
    </div>
  );
}