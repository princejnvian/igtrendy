"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();

  const [isSignup, setIsSignup] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isSignup) {
        if (!fullName.trim()) {
          setError("Please enter your full name.");
          setLoading(false);
          return;
        }

        if (!username.trim()) {
          setError("Please choose a username.");
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              username: username.trim().toLowerCase(),
            },
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setSuccess(
            "Account created successfully. You can now sign in."
          );
          setIsSignup(false);
          setPassword("");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="simple-page">
      <Link href="/" className="brand">
        <span className="brand-mark">✦</span> IG<span>TRENDY</span>
      </Link>

      <div className="auth-card">
        <div className="eyebrow">
          <span /> CREATOR COMMUNITY
        </div>

        <h1>{isSignup ? "Create your account." : "Welcome back."}</h1>

        <p>
          {isSignup
            ? "Join IGTrendy and share your AI prompts with the community."
            : "Sign in to upload prompts, connect with creators and message your friends."}
        </p>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <input
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </>
          )}

          <input
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div
              style={{
                color: "#ff7b7b",
                fontSize: "14px",
                marginTop: "8px",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                color: "#7ee787",
                fontSize: "14px",
                marginTop: "8px",
              }}
            >
              {success}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : isSignup
                ? "Create Account"
                : "Sign In"}
          </button>
        </form>

        <small>
          {isSignup ? "Already have an account? " : "New here? "}

          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
              setSuccess("");
            }}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "inherit",
              cursor: "pointer",
              font: "inherit",
              textDecoration: "underline",
            }}
          >
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </small>
      </div>
    </main>
  );
}