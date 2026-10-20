"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import IGTrendyLogo from "@/components/YoutentLogo";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setSuccess("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback` } });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess("Account created. Check your email if confirmation is required, then sign in.");
  }
  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-900"><div className="mx-auto max-w-md"><div className="mb-8 flex justify-center"><IGTrendyLogo lightWordmark /></div><section className="rounded-3xl bg-white p-7 shadow-2xl sm:p-9"><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-700">Join IGTrendy</p><h1 className="mt-2 text-3xl font-black">Create your account</h1><p className="mt-2 text-sm text-slate-500">Sign up to save prompts and access your account.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-semibold">Full name<input required value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-cyan-600" autoComplete="name" /></label><label className="block text-sm font-semibold">Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-cyan-600" autoComplete="email" /></label><label className="block text-sm font-semibold">Password<input required type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-cyan-600" autoComplete="new-password" /></label>{error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{success&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}<button disabled={loading} className="w-full rounded-xl bg-slate-950 px-4 py-3 font-bold text-white disabled:opacity-60">{loading?"Creating account…":"Create account"}</button></form><p className="mt-6 text-center text-sm text-slate-500">Already registered? <Link href="/login" className="font-bold text-cyan-700">Sign in</Link></p></section></div></main>;
}
