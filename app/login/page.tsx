"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    setIsSignup(new URLSearchParams(window.location.search).get("mode") === "signup");

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setCurrentUser(data.user ?? null);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setCurrentUser(session?.user ?? null);
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (isSignup) {
        if (!fullName.trim()) throw new Error("Please enter your full name.");
        if (!username.trim()) throw new Error("Please choose a username.");
        if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
          throw new Error("Username must be 3–30 characters and use only letters, numbers or underscore.");
        }
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              username: username.trim().toLowerCase(),
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setCurrentUser(data.user);
          router.push("/");
          router.refresh();
          return;
        }

        setSuccess("Account created. Check your email if confirmation is enabled, then sign in.");
        setIsSignup(false);
        setPassword("");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw error;

        setCurrentUser(data.user);
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setEmail("");
    setPassword("");
    setSuccess("");
    setError("");
  }

  function switchMode(nextSignup: boolean) {
    setIsSignup(nextSignup);
    setError("");
    setSuccess("");
    router.replace(nextSignup ? "/login?mode=signup" : "/login");
  }

  if (checkingSession) {
    return (
      <main className="simple-page">
        <Link href="/" className="brand brand-image-link" aria-label="IGTrendy home"><img src="/igtrendy-logo.svg" alt="IGTrendy" className="auth-logo-image" /></Link>
        <div className="auth-card"><div className="eyebrow"><span /> ACCOUNT</div><h1>Checking your session…</h1><p>One moment.</p></div>
      </main>
    );
  }

  if (currentUser) {
    const displayName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.username || currentUser.email?.split("@")[0] || "there";
    const initial = displayName.charAt(0).toUpperCase();

    return (
      <main className="simple-page">
        <Link href="/" className="brand brand-image-link" aria-label="IGTrendy home"><img src="/igtrendy-logo.svg" alt="IGTrendy" className="auth-logo-image" /></Link>
        <div className="auth-card signed-in-card">
          <div className="signed-in-avatar">{initial}</div>
          <div className="eyebrow"><span /> YOU ARE SIGNED IN</div>
          <h1>Welcome, {displayName}.</h1>
          <p>{currentUser.email}</p>
          <div className="auth-links-row">
            <Link href="/" className="primary-btn">Explore IGTrendy</Link>
            <button type="button" className="auth-secondary-btn" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="simple-page">
      <Link href="/" className="brand brand-image-link" aria-label="IGTrendy home">
        <img src="/igtrendy-logo.svg" alt="IGTrendy" className="auth-logo-image" />
      </Link>

      <div className="auth-card">
        <div className="eyebrow"><span /> IG TRENDY ACCOUNT</div>
        <h1>{isSignup ? "Create your account." : "Welcome back."}</h1>
        <p>{isSignup ? "Create an account to upload AI prompts, build your profile and interact with the community." : "Sign in to upload prompts, manage your profile and access your account features."}</p>

        <div className="auth-mode">
          <button type="button" className={!isSignup ? "active" : ""} onClick={() => switchMode(false)}>Sign in</button>
          <button type="button" className={isSignup ? "active" : ""} onClick={() => switchMode(true)}>Create account</button>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              <input placeholder="Username (e.g. princejnvian)" value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))} required />
            </>
          )}

          <input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          {error && <div className="auth-error" role="alert">{error}</div>}
          {success && <div className="auth-success" role="status">{success}</div>}

          <button type="submit" disabled={loading}>{loading ? "Please wait…" : isSignup ? "Create account →" : "Sign in →"}</button>
        </form>

        <small>
          {isSignup ? "Already have an account? " : "New to IGTrendy? "}
          <button type="button" className="auth-toggle" onClick={() => switchMode(!isSignup)}>
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </small>
      </div>
    </main>
  );
}
