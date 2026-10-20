"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import YoutentLogo from "@/components/YoutentLogo";
const availableSkills = [
  "Video Editing",
  "Thumbnail Design",
  "Voice Over",
  "Shorts Editing",
  "Reels Editing",
  "YouTube Editing",
  "Motion Graphics",
  "Animation",
  "Graphic Design",
  "Script Writing",
];

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const [accountType, setAccountType] = useState<
    "client" | "freelancer"
  >("client");

  const [skills, setSkills] = useState<string[]>([]);

  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ================= LOAD PROFILE =================

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "full_name, username, bio, account_type, skills, avatar_url"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setFullName(profile.full_name || "");
        setUsername(profile.username || "");
        setBio(profile.bio || "");

        if (
          profile.account_type === "freelancer" ||
          profile.account_type === "client"
        ) {
          setAccountType(profile.account_type);
        }

        setSkills(profile.skills || []);
        setAvatarUrl(profile.avatar_url || "");
      }

      setLoading(false);
    }

    loadProfile();
  }, [router, supabase]);

  // ================= AVATAR UPLOAD =================

  async function handleAvatarUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    try {
      setError("");
      setSuccess("");

      const file = e.target.files?.[0];

      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        setError("Please select an image file.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB.");
        return;
      }

      setUploading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setError(uploadError.message);
        setUploading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            avatar_url: publicUrl,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) {
        setError(profileError.message);
        setUploading(false);
        return;
      }

      setAvatarUrl(publicUrl);
      setSuccess("Profile photo uploaded successfully!");
      setUploading(false);

      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Something went wrong while uploading the photo.");
      setUploading(false);
    }
  }

  // ================= SKILLS =================

  function toggleSkill(skill: string) {
    setSkills((currentSkills) => {
      if (currentSkills.includes(skill)) {
        return currentSkills.filter((item) => item !== skill);
      }

      if (currentSkills.length >= 5) {
        return currentSkills;
      }

      return [...currentSkills, skill];
    });
  }

  // ================= SAVE PROFILE =================

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const cleanName = fullName.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanBio = bio.trim();

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }

    if (!cleanUsername) {
      setError("Please choose a username.");
      return;
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setError(
        "Username can only contain lowercase letters, numbers and underscores."
      );
      return;
    }

    if (cleanBio.length > 500) {
      setError("Bio must be 500 characters or less.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          full_name: cleanName,
          username: cleanUsername,
          bio: cleanBio,
          account_type: accountType,
          skills,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

    if (updateError) {
      if (updateError.code === "23505") {
        setError(
          "That username is already taken. Please choose another one."
        );
      } else {
        setError(updateError.message);
      }

      setSaving(false);
      return;
    }

    setFullName(cleanName);
    setUsername(cleanUsername);
    setBio(cleanBio);

    setSuccess("Profile saved successfully!");

    setSaving(false);

    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 800);
  }

  // ================= LOADING =================

  if (loading) {
    return (
      <main className="youtent-app-bg flex min-h-screen items-center justify-center text-slate-900">
        <div className="text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          </div>

          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading your profile...
          </p>

        </div>
      </main>
    );
  }

  const profileScore =
    (fullName ? 25 : 0) +
    (username ? 20 : 0) +
    (bio ? 20 : 0) +
    (avatarUrl ? 20 : 0) +
    (skills.length > 0 ? 15 : 0);

  return (
    <main className="youtent-app-bg min-h-screen text-slate-900">

      {/* ================= NAVBAR ================= */}

      <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">

          <YoutentLogo href="/dashboard" />

          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition duration-300 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <span className="transition-transform duration-300 group-hover:-translate-x-1">
              ←
            </span>
            Dashboard
          </Link>

        </div>
      </nav>

      {/* ================= HERO ================= */}

      <section className="relative overflow-hidden border-b border-slate-200 bg-white">

        <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-0 h-80 w-80 rounded-full bg-violet-200/30 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-14">

          <div className="max-w-3xl">

            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Profile Settings
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Make your profile{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                stand out.
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Tell the YOUTENT community who you are, what you do and
              what you can bring to the table.
            </p>

          </div>

        </div>
      </section>

      {/* ================= PAGE ================= */}

      <section className="px-5 py-10 sm:px-6 sm:py-12">

        <div className="mx-auto max-w-4xl">

          {/* ================= PROFILE COMPLETION ================= */}

          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-sm font-black text-slate-900">
                  Profile strength
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  A complete profile helps people understand you better.
                </p>
              </div>

              <div className="flex items-center gap-3">

                <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-600 transition-all duration-500"
                    style={{ width: `${profileScore}%` }}
                  />
                </div>

                <span className="text-sm font-black text-slate-900">
                  {profileScore}%
                </span>

              </div>

            </div>

          </div>

          <form onSubmit={handleSave}>

            {/* ================= MAIN CARD ================= */}

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

              {/* ================= PROFILE HEADER ================= */}

              <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 px-6 py-8 sm:px-9 sm:py-10">

                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />

                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">

                  {/* Avatar */}

                  <div className="relative shrink-0">

                    {avatarUrl ? (

                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="h-28 w-28 rounded-3xl border-4 border-white/20 object-cover shadow-2xl"
                      />

                    ) : (

                      <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-white/10 bg-white/10 text-4xl font-black text-white shadow-2xl backdrop-blur">
                        {fullName
                          ? fullName.charAt(0).toUpperCase()
                          : "Y"}
                      </div>

                    )}

                    <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-slate-950 bg-emerald-400" />

                  </div>

                  <div className="min-w-0">

                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
                      Your YOUTENT Profile
                    </p>

                    <h2 className="mt-2 truncate text-2xl font-black text-white sm:text-3xl">
                      {fullName || "Your Name"}
                    </h2>

                    <p className="mt-1 truncate text-sm text-slate-300">
                      {email}
                    </p>

                    <label className="mt-4 inline-flex cursor-pointer items-center rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-900 shadow-lg transition duration-300 hover:-translate-y-0.5 hover:bg-blue-50">

                      {uploading
                        ? "Uploading..."
                        : avatarUrl
                        ? "Change Photo"
                        : "Upload Photo"}

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploading}
                        className="hidden"
                      />

                    </label>

                    <p className="mt-2 text-xs text-slate-400">
                      JPG, PNG or WEBP · Maximum 5MB
                    </p>

                  </div>

                </div>

              </div>

              {/* ================= FORM ================= */}

              <div className="space-y-8 p-6 sm:p-9">

                {/* ================= BASIC INFO ================= */}

                <div>

                  <div className="mb-5">

                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                      Personal Information
                    </p>

                    <h3 className="mt-1 text-xl font-black text-slate-950">
                      Basic details
                    </h3>

                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">

                    {/* Full Name */}

                    <div>

                      <label
                        htmlFor="fullName"
                        className="mb-2 block text-sm font-bold text-slate-800"
                      >
                        Full Name
                      </label>

                      <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) =>
                          setFullName(e.target.value)
                        }
                        placeholder="Enter your full name"
                        maxLength={100}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium outline-none transition duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />

                    </div>

                    {/* Username */}

                    <div>

                      <label
                        htmlFor="username"
                        className="mb-2 block text-sm font-bold text-slate-800"
                      >
                        Username
                      </label>

                      <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 transition duration-200 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10">

                        <span className="pl-4 text-sm font-bold text-slate-400">
                          @
                        </span>

                        <input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(e) =>
                            setUsername(
                              e.target.value
                                .toLowerCase()
                                .replace(/\s/g, "")
                            )
                          }
                          placeholder="yourusername"
                          maxLength={30}
                          required
                          className="w-full bg-transparent px-2 py-3.5 text-sm font-medium outline-none placeholder:text-slate-400"
                        />

                      </div>

                      <p className="mt-2 text-xs text-slate-400">
                        Lowercase letters, numbers and underscores only.
                      </p>

                    </div>

                  </div>

                </div>

                {/* ================= ACCOUNT TYPE ================= */}

                <div>

                  <div className="mb-5">

                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                      Account
                    </p>

                    <h3 className="mt-1 text-xl font-black text-slate-950">
                      How will you use YOUTENT?
                    </h3>

                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">

                    {/* Client */}

                    <button
                      type="button"
                      onClick={() => setAccountType("client")}
                      className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition duration-300 ${
                        accountType === "client"
                          ? "border-blue-500 bg-blue-50/70 shadow-lg shadow-blue-100"
                          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                      }`}
                    >

                      {accountType === "client" && (
                        <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                          ✓
                        </div>
                      )}

                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-xl transition duration-300 group-hover:scale-105">
                        💼
                      </div>

                      <p className="mt-4 text-lg font-black text-slate-900">
                        Client
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        I want to hire creative professionals for my projects.
                      </p>

                    </button>

                    {/* Freelancer */}

                    <button
                      type="button"
                      onClick={() => setAccountType("freelancer")}
                      className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition duration-300 ${
                        accountType === "freelancer"
                          ? "border-violet-500 bg-violet-50/70 shadow-lg shadow-violet-100"
                          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
                      }`}
                    >

                      {accountType === "freelancer" && (
                        <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white">
                          ✓
                        </div>
                      )}

                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-xl transition duration-300 group-hover:scale-105">
                        🎨
                      </div>

                      <p className="mt-4 text-lg font-black text-slate-900">
                        Freelancer
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        I want to offer my creative skills and services.
                      </p>

                    </button>

                  </div>

                </div>

                {/* ================= BIO ================= */}

                <div>

                  <div className="mb-2 flex items-center justify-between">

                    <label
                      htmlFor="bio"
                      className="text-sm font-bold text-slate-800"
                    >
                      Bio
                    </label>

                    <span
                      className={`text-xs font-bold ${
                        bio.length >= 450
                          ? "text-orange-500"
                          : "text-slate-400"
                      }`}
                    >
                      {bio.length}/500
                    </span>

                  </div>

                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) =>
                      setBio(e.target.value)
                    }
                    placeholder={
                      accountType === "freelancer"
                        ? "Tell clients about your experience, style and what you can create..."
                        : "Tell creators about yourself and the kind of projects you work on..."
                    }
                    maxLength={500}
                    rows={6}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm leading-6 font-medium outline-none transition duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />

                </div>

                {/* ================= SKILLS ================= */}

                <div>

                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">

                    <div>

                      <label className="text-sm font-bold text-slate-800">
                        Skills & Expertise
                      </label>

                      <p className="mt-1 text-xs text-slate-400">
                        Select up to 5 skills that best describe you.
                      </p>

                    </div>

                    <span className="text-xs font-black text-blue-600">
                      {skills.length}/5 selected
                    </span>

                  </div>

                  <div className="mt-4 flex flex-wrap gap-2.5">

                    {availableSkills.map((skill) => {

                      const selected = skills.includes(skill);

                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`rounded-full border px-4 py-2.5 text-sm font-bold transition duration-200 ${
                            selected
                              ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20"
                              : "border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                          }`}
                        >
                          {selected && (
                            <span className="mr-1">
                              ✓
                            </span>
                          )}
                          {skill}
                        </button>
                      );
                    })}

                  </div>

                </div>

                {/* ================= MESSAGES ================= */}

                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 font-black">
                      !
                    </span>

                    <p className="pt-0.5">
                      {error}
                    </p>
                  </div>
                )}

                {success && (
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black">
                      ✓
                    </span>

                    <p className="pt-0.5">
                      {success}
                    </p>
                  </div>
                )}

              </div>

              {/* ================= FOOTER ================= */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:px-9 sm:py-6">

                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-slate-900"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/30 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save Profile
                      <span className="ml-2">→</span>
                    </>
                  )}
                </button>

              </div>

            </div>

          </form>

        </div>

      </section>

      {/* ================= FOOTER ================= */}

      <footer className="border-t border-slate-200 bg-white">

        <div className="mx-auto flex max-w-4xl flex-col gap-2 px-5 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">

          <p>
            © {new Date().getFullYear()} YOUTENT. All rights reserved.
          </p>

          <p className="font-medium">
            Where Talent Meets Opportunity
          </p>

        </div>

      </footer>

    </main>
  );
}