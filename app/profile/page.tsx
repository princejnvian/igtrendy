"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MarketplaceHeader from "@/components/MarketplaceHeader";
import { DEFAULT_GIG_PACKAGES, normalizeGigs } from "@/lib/gigs";
import type { CreatorGig, ServicePackage, GigMedia } from "@/lib/gigs";
import { MARKETPLACE_CATEGORIES, getSubcategories } from "@/lib/marketplace-categories";

const categories = MARKETPLACE_CATEGORIES.map((item) => item.label);



const availableSkills = [
  "Video Editing", "Thumbnail Design", "Voice Over", "Shorts Editing",
  "Reels Editing", "YouTube Editing", "Motion Graphics", "Animation",
  "Graphic Design", "Script Writing", "Audio Editing", "SEO",
  "Social Media", "Web Development", "AI Content", "Photography",
];

type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  mediaType: "image" | "video" | "audio";
  category: string;
};

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [accountType, setAccountType] = useState<"client" | "freelancer">("client");
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [primaryCategory, setPrimaryCategory] = useState("");
  const [startingPrice, setStartingPrice] = useState<string>("499");
  const [wallet, setWallet] = useState<{ available_balance: number; pending_balance: number } | null>(null);
  const [gigs, setGigs] = useState<CreatorGig[]>([]);
  const [selectedGigId, setSelectedGigId] = useState("");
  const [packages, setPackages] = useState<ServicePackage[]>(DEFAULT_GIG_PACKAGES);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setEmail(user.email || "");
      const { data: profile } = await supabase.from("profiles").select("full_name, username, bio, account_type, skills, avatar_url, primary_category, categories, starting_price, service_packages, gigs, portfolio").eq("id", user.id).maybeSingle();
      if (profile) {
        setFullName(profile.full_name || "");
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        if (profile.account_type === "freelancer" || profile.account_type === "client") setAccountType(profile.account_type);
        const isFreelancerProfile = profile.account_type === "freelancer";
        setSkills(isFreelancerProfile && Array.isArray(profile.skills) ? profile.skills : []);
        setSelectedCategories(isFreelancerProfile && Array.isArray(profile.categories) ? profile.categories : []);
        setPrimaryCategory(isFreelancerProfile ? (profile.primary_category || "") : "");
        setStartingPrice(isFreelancerProfile && profile.starting_price !== null && profile.starting_price !== undefined && Number(profile.starting_price) !== 0 ? String(profile.starting_price) : "");
        if (profile.account_type === "freelancer") {
          const { data: walletRow } = await supabase.from("wallets").select("available_balance,pending_balance").eq("user_id", user.id).maybeSingle();
          setWallet(walletRow || { available_balance: 0, pending_balance: 0 });
        }
        const loadedGigs = isFreelancerProfile
          ? normalizeGigs(profile.gigs, profile.service_packages, profile.primary_category || profile.categories?.[0])
          : [];
        setGigs(loadedGigs);
        const firstGig = loadedGigs[0];
        setSelectedGigId(firstGig?.id || "");
        setPackages(firstGig?.packages?.length ? firstGig.packages : DEFAULT_GIG_PACKAGES);
        setPortfolio(isFreelancerProfile && Array.isArray(profile.portfolio) ? profile.portfolio : []);
        setAvatarUrl(profile.avatar_url || "");
      }
      setLoading(false);
    }
    loadProfile();
  }, [router, supabase]);

  async function handleAvatarUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setSuccess("");
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image size must be less than 5MB."); return; }
    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${user.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const response = await fetch("/api/profile/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName, username, bio, skills, categories: selectedCategories, primaryCategory, startingPrice, servicePackages: packages, gigs, portfolio, avatarUrl: publicUrl }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update profile photo.");
      setAvatarUrl(publicUrl); setSuccess("Profile photo updated.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to upload profile photo."); }
    finally { setUploadingAvatar(false); }
  }

  function toggleSkill(skill: string) {
    setSkills((current) => current.includes(skill) ? current.filter((item) => item !== skill) : current.length >= 8 ? current : [...current, skill]);
  }

  function toggleCategory(category: string) {
    setSelectedCategories((current) => {
      if (current.includes(category)) {
        if (primaryCategory === category) setPrimaryCategory("");
        return current.filter((item) => item !== category);
      }
      if (current.length >= 3) return current;
      if (!primaryCategory) setPrimaryCategory(category);
      return [...current, category];
    });
  }

  function syncSelectedGig(nextPackages: ServicePackage[]) {
    setPackages(nextPackages);
    if (!selectedGigId) return;
    setGigs((current) => current.map((gig) => gig.id === selectedGigId ? { ...gig, packages: nextPackages as ServicePackage[] } : gig));
  }

  function updatePackage(id: string, field: keyof ServicePackage, value: string) {
    const next = packages.map((item) => {
      if (item.id !== id) return item;
      if (field === "price" || field === "deliveryDays" || field === "revisions") {
        return { ...item, [field]: value === "" ? "" : Math.max(0, Number(value)) };
      }
      return { ...item, [field]: value };
    });
    syncSelectedGig(next);
  }

  function selectGig(id: string) {
    const target = gigs.find((gig) => gig.id === id);
    if (!target) return;
    setSelectedGigId(id);
    setPackages(target.packages);
  }

  function updateGig(field: "title" | "category" | "subcategory" | "description", value: string) {
    if (!selectedGigId) return;
    setGigs((current) => current.map((gig) => gig.id === selectedGigId ? { ...gig, [field]: value } : gig));
  }

  async function uploadPackageMedia(file: File, packageId: string) {
    if (!selectedGigId) { setError("Select a gig first."); return; }
    const activeGig = gigs.find((gig) => gig.id === selectedGigId);
    const targetPackage = activeGig?.packages.find((item) => item.id === packageId);
    if (!activeGig || !targetPackage) return;
    if (targetPackage.media.length >= 6) { setError(`You can add up to 6 photos/videos to ${targetPackage.name}.`); return; }
    setError(""); setSuccess(""); setUploadingPortfolio(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("gigId", selectedGigId);
      form.append("packageId", packageId);
      const response = await fetch("/api/gigs/media/upload", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to upload package media.");

      const media: GigMedia = result.media || {
        id: crypto.randomUUID(),
        url: typeof result.url === "string" ? result.url : "",
        path: typeof result.path === "string" ? result.path : "",
        mediaType: result.mediaType === "video" ? "video" : "image",
        title: file.name,
      };
      if (!media.url) throw new Error("The media uploaded but no file URL was returned.");

      setGigs((current) => current.map((gig) => gig.id === selectedGigId
        ? { ...gig, packages: gig.packages.map((item) => item.id === packageId ? { ...item, media: [...item.media, media] } : item) }
        : gig
      ));
      setPackages((current) => current.map((item) => item.id === packageId ? { ...item, media: [...item.media, media] } : item));
      setSuccess(`${targetPackage.name} media uploaded and saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload package media.");
    } finally { setUploadingPortfolio(false); }
  }

  function removePackageMedia(packageId: string, mediaId: string) {
    if (!selectedGigId) return;
    setGigs((current) => current.map((gig) => gig.id === selectedGigId
      ? { ...gig, packages: gig.packages.map((item) => item.id === packageId ? { ...item, media: item.media.filter((media) => media.id !== mediaId) } : item) }
      : gig
    ));
    setPackages((current) => current.map((item) => item.id === packageId ? { ...item, media: item.media.filter((media) => media.id !== mediaId) } : item));
    setSuccess("Media removed locally. Click Save Profile to confirm the removal.");
  }

  function addGig() {
    const id = crypto.randomUUID();
    const category = primaryCategory || selectedCategories[0] || categories[0];
    const gig: CreatorGig = { id, title: "New Gig", category, subcategory: getSubcategories(category)[0] || "", tags: [], description: "Describe exactly what you deliver in this gig.", media: [], packages: DEFAULT_GIG_PACKAGES.map((item) => ({ ...item })) };
    setGigs((current) => [...current, gig]);
    setSelectedGigId(id);
    setPackages(gig.packages);
  }

  function deleteSelectedGig() {
    if (!selectedGigId) return;
    const remaining = gigs.filter((gig) => gig.id !== selectedGigId);
    setGigs(remaining);
    const next = remaining[0];
    setSelectedGigId(next?.id || "");
    setPackages(next?.packages || []);
    setSuccess("Gig removed. Click Save Profile to confirm the deletion.");
  }

  async function uploadPortfolio(file: File) {
    setError(""); setSuccess("");
    if (portfolio.length >= 12) { setError("You can add up to 12 portfolio items."); return; }
    setUploadingPortfolio(true);
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/portfolio/upload", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to upload portfolio file.");
      const item: PortfolioItem = { id: crypto.randomUUID(), title: file.name.replace(/\.[^.]+$/, ""), description: "", url: result.url, mediaType: result.mediaType, category: primaryCategory || selectedCategories[0] || "Creative Work" };
      setPortfolio((current) => [...current, item]); setSuccess("Portfolio item uploaded. Add a title and save your profile.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to upload portfolio file."); }
    finally { setUploadingPortfolio(false); }
  }

  function removePortfolio(id: string) { setPortfolio((current) => current.filter((item) => item.id !== id)); }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setSuccess("");
    const cleanName = fullName.trim(); const cleanUsername = username.trim().toLowerCase(); const cleanBio = bio.trim();
    if (!cleanName) return setError("Please enter your full name.");
    if (!cleanUsername || !/^[a-z0-9_]+$/.test(cleanUsername)) return setError("Username can only contain lowercase letters, numbers and underscores.");
    if (cleanUsername.length > 30) return setError("Username must be 30 characters or less.");
    if (cleanBio.length > 500) return setError("Bio must be 500 characters or less.");
    if (accountType === "freelancer" && selectedCategories.length === 0) return setError("Please select at least one category for your services.");
    setSaving(true);
    try {
      const response = await fetch("/api/profile/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: cleanName, username: cleanUsername, bio: cleanBio, skills, categories: selectedCategories, primaryCategory, startingPrice: accountType === "freelancer" ? Number(startingPrice || 0) : null, servicePackages: accountType === "freelancer" ? packages.map((item) => ({ ...item, price: Number(item.price || 0), deliveryDays: Number(item.deliveryDays || 0), revisions: Number(item.revisions || 0) })) : [], gigs: accountType === "freelancer" ? gigs.map((gig) => ({ ...gig, packages: gig.packages.map((item) => ({ ...item, price: Number(item.price || 0), deliveryDays: Number(item.deliveryDays || 0), revisions: Number(item.revisions || 0) })) })) : [], portfolio: accountType === "freelancer" ? portfolio : [], avatarUrl }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save your profile.");
      setSuccess("Profile saved successfully."); setFullName(cleanName); setUsername(cleanUsername); setBio(cleanBio);
      setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 700);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save your profile."); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center youtent-app-bg"><div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" /><p className="mt-4 text-sm font-semibold text-slate-500">Loading your profile...</p></div></main>;

  const profileScore = Math.min(100, (fullName ? 20 : 0) + (username ? 20 : 0) + (bio ? 20 : 0) + (avatarUrl ? 20 : 0) + (accountType === "freelancer" ? (skills.length ? 10 : 0) + (selectedCategories.length ? 5 : 0) + (portfolio.length ? 5 : 0) : 20));

  return (
    <main className="min-h-screen youtent-app-bg text-slate-950">
      <MarketplaceHeader accountType={accountType} />
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-7 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><span className="inline-flex rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">Profile Studio</span><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Build a profile clients remember.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Create your identity, choose your marketplace categories, showcase your work and publish clear service pricing.</p></div>
          <div className="profile-strength-card w-full max-w-xs rounded-2xl border border-white/80 bg-white/80 p-4 shadow-lg backdrop-blur"><div className="flex justify-between text-xs font-bold"><span>Profile strength</span><span className="text-blue-600">{profileScore}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" style={{ width: `${profileScore}%` }} /></div></div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="space-y-6">
              <section className="premium-card p-6 sm:p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <div className="relative shrink-0">{avatarUrl ? <img src={avatarUrl} alt={fullName || "Profile"} className="h-28 w-28 rounded-3xl object-cover shadow-xl ring-4 ring-white" /> : <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-4xl font-black text-white shadow-xl">{fullName.charAt(0).toUpperCase() || "Y"}</div>}<label className="absolute -bottom-2 -right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-4 border-white bg-slate-950 text-white shadow-lg hover:bg-blue-600">{uploadingAvatar ? "…" : "📸"}<input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} /></label></div>
                  <div><p className="text-xs font-black uppercase tracking-widest text-blue-600">Identity</p><h2 className="mt-1 text-2xl font-black">Your public profile</h2><p className="mt-2 text-sm leading-6 text-slate-500">This information appears across YOUTENT when clients discover you.</p><p className="mt-3 text-xs font-semibold text-slate-400">{email}</p></div>
                </div>
                <div className="mt-7 grid gap-4 sm:grid-cols-2"><Field label="Full Name" value={fullName} onChange={setFullName} placeholder="Your professional name" /><Field label="Username" value={username} onChange={setUsername} placeholder="your_username" /></div>
                <div className="mt-4"><label className="mb-2 block text-sm font-bold">Bio</label><textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={5} placeholder="Tell clients what you do, your style and the results you can deliver..." className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" /><div className="mt-1 text-right text-xs text-slate-400">{bio.length}/500</div></div>
              </section>

              {accountType === "freelancer" && <>
                <section className="premium-card p-6 sm:p-8">
                  <div><p className="text-xs font-black uppercase tracking-widest text-blue-600">Marketplace categories</p><h2 className="mt-1 text-2xl font-black">What do you sell?</h2><p className="mt-2 text-sm text-slate-500">Choose up to 3 categories. Your primary category powers discovery and the top navigation.</p></div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Primary category</label><select value={primaryCategory} onChange={(e) => setPrimaryCategory(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"> <option value="">Choose your main category</option>{selectedCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>{categories.map((category) => <button key={category} type="button" onClick={() => toggleCategory(category)} className={`category-selection-card relative rounded-2xl border p-4 text-left transition ${selectedCategories.includes(category) ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md shadow-blue-100" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"}`}><span className="text-sm font-bold">{category}</span><span className="category-selection-copy mt-1 block text-xs text-slate-500">{selectedCategories.includes(category) ? "Selected for your services" : "Add to your profile"}</span>{selectedCategories.includes(category) && <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">✓</span>}</button>)}</div>
                </section>

                <section className="premium-card p-6 sm:p-8"><div><p className="text-xs font-black uppercase tracking-widest text-violet-600">Skills</p><h2 className="mt-1 text-2xl font-black">Your expertise</h2><p className="mt-2 text-sm text-slate-500">Pick up to 8 skills that describe the services you can deliver.</p></div><div className="mt-5 flex flex-wrap gap-2.5">{availableSkills.map((skill) => <button key={skill} type="button" onClick={() => toggleSkill(skill)} className={`rounded-full border px-4 py-2.5 text-xs font-bold transition ${skills.includes(skill) ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"}`}>{skills.includes(skill) && "✓ "}{skill}</button>)}</div><p className="mt-4 text-xs font-bold text-slate-400">{skills.length}/8 selected</p></section>

                <section className="premium-card overflow-hidden p-6 sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Portfolio</p><h2 className="mt-1 text-2xl font-black">Showcase your best work</h2><p className="mt-2 max-w-xl text-sm text-slate-500">Add images, short videos or audio demos. These will appear on your public creator profile.</p></div><label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-600">{uploadingPortfolio ? "Uploading..." : "＋ Add work"}<input type="file" accept="image/*,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/ogg,audio/mp4" className="hidden" disabled={uploadingPortfolio} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadPortfolio(file); e.currentTarget.value = ""; }} /></label></div>
                  {portfolio.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">▧</div><h3 className="mt-3 font-black">Your portfolio is empty</h3><p className="mt-1 text-sm text-slate-500">Upload a thumbnail, editing sample, reel or voice demo to get started.</p></div> : <div className="mt-6 grid gap-4 sm:grid-cols-2">{portfolio.map((item) => <div key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="aspect-[16/10] bg-slate-100">{item.mediaType === "image" ? <img src={item.url} alt={item.title} className="h-full w-full object-cover" /> : item.mediaType === "video" ? <video src={item.url} controls className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center p-5"><audio src={item.url} controls className="w-full" /></div>}</div><div className="p-4"><input value={item.title} onChange={(e) => setPortfolio((all) => all.map((x) => x.id === item.id ? { ...x, title: e.target.value } : x))} className="w-full rounded-lg border border-transparent px-2 py-1 text-sm font-black outline-none hover:border-slate-200 focus:border-blue-400" /><textarea value={item.description} onChange={(e) => setPortfolio((all) => all.map((x) => x.id === item.id ? { ...x, description: e.target.value } : x))} placeholder="Short description" rows={2} className="mt-1 w-full resize-none rounded-lg border border-transparent px-2 py-1 text-xs text-slate-500 outline-none hover:border-slate-200 focus:border-blue-400" /><div className="mt-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.category}</span><button type="button" onClick={() => removePortfolio(item.id)} className="text-xs font-bold text-red-500 hover:text-red-700">Remove</button></div></div></div>)}</div>}
                </section>

                <section className="premium-card p-6 sm:p-8">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div><p className="text-xs font-black uppercase tracking-widest text-emerald-600">Gigs & pricing</p><h2 className="mt-1 text-2xl font-black">Create multiple gigs</h2><p className="mt-2 max-w-2xl text-sm text-slate-500">Create separate services for different skills. Each gig can have its own category, title and Basic, Standard and Premium pricing.</p></div>
                    <button type="button" onClick={addGig} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-blue-600">＋ Add new gig</button>
                  </div>

                  {gigs.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-semibold text-slate-500">Add your first gig to start selling a service.</div> : (
                    <>
                      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
                        {gigs.map((gig) => <button key={gig.id} type="button" onClick={() => selectGig(gig.id)} className={`min-w-[190px] rounded-2xl border p-4 text-left ${selectedGigId === gig.id ? "border-blue-600 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-200"}`}><p className="truncate text-sm font-black text-slate-950">{gig.title || "Untitled gig"}</p><p className="mt-1 truncate text-xs font-semibold text-slate-500">{gig.category}</p></button>)}
                      </div>

                      {(() => { const activeGig = gigs.find((gig) => gig.id === selectedGigId) || gigs[0]; return <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-blue-600">Gig details</p><h3 className="mt-1 text-xl font-black">{activeGig.title}</h3></div><button type="button" onClick={deleteSelectedGig} className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50">Delete gig</button></div>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                          <div><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Gig title</label><input value={activeGig.title} onChange={(e) => updateGig("title", e.target.value)} placeholder="Example: Professional Instagram Reel Editing" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-400" /></div>
                          <div><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Gig category</label><select value={activeGig.category} onChange={(e) => { const category = e.target.value; updateGig("category", category); const nextSubcategory = getSubcategories(category)[0] || ""; setGigs((current) => current.map((gig) => gig.id === selectedGigId ? { ...gig, category, subcategory: nextSubcategory } : gig)); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-400">{categories.map((category) => <option key={category}>{category}</option>)}</select></div>
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Subcategory</label><select value={activeGig.subcategory || ""} onChange={(e) => updateGig("subcategory", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-400"><option value="">Select subcategory</option>{getSubcategories(activeGig.category).map((item) => <option key={item}>{item}</option>)}</select></div>
                          <div><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Tags</label><input value={(activeGig.tags || []).join(", ")} onChange={(e) => { const tags = e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 10); setGigs((current) => current.map((gig) => gig.id === selectedGigId ? { ...gig, tags } : gig)); }} placeholder="e.g. logo, branding, modern" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-400" /><p className="mt-1 text-[11px] text-slate-400">Separate tags with commas · up to 10</p></div>
                        </div>
                        <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">Gig description</label><textarea value={activeGig.description} onChange={(e) => updateGig("description", e.target.value)} rows={3} placeholder="Tell clients exactly what this gig is for." className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400" />

                        <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                          <p className="text-xs font-black uppercase tracking-widest text-violet-600">Package media</p>
                          <p className="mt-1 text-sm font-bold text-slate-900">Upload different photos/videos for Basic, Standard and Premium.</p>
                          <p className="mt-1 text-xs text-slate-500">Each package can have up to 6 files, max 30MB each. Clients will only see the media for the package they select.</p>
                        </div>

                        <div className="mt-6 grid gap-5 lg:grid-cols-3">{packages.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="flex items-center justify-between"><h4 className="font-black text-lg">{item.name}</h4><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">PACKAGE</span></div>
                          <div className="mt-4 rounded-xl border border-dashed border-violet-200 bg-violet-50/60 p-3">
                            <div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-wider text-violet-600">{item.name} media</p><p className="mt-1 text-[10px] text-slate-500">{item.media.length}/6 files</p></div><label className="inline-flex cursor-pointer items-center rounded-lg bg-violet-600 px-3 py-2 text-[10px] font-black text-white hover:bg-violet-700">{uploadingPortfolio ? "Uploading..." : "＋ Add media"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" className="hidden" disabled={uploadingPortfolio || item.media.length >= 6} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadPackageMedia(file, item.id); e.currentTarget.value = ""; }} /></label></div>
                            {item.media.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2">{item.media.map((media) => <div key={media.id} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">{media.mediaType === "video" ? <video src={media.url} controls className="aspect-video w-full object-cover" /> : <img src={media.url} alt={media.title || item.name} className="aspect-video w-full object-cover" />}<div className="flex items-center justify-between gap-1 p-1.5"><span className="truncate text-[9px] font-bold text-slate-500">{media.mediaType === "video" ? "VIDEO" : "IMAGE"}</span><button type="button" onClick={() => removePackageMedia(item.id, media.id)} className="text-[9px] font-black text-red-500 hover:text-red-700">Remove</button></div></div>)}</div>}
                          </div>
                          <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Package description</label><textarea value={item.description} onChange={(e) => updatePackage(item.id, "description", e.target.value)} rows={3} placeholder="Example: Edit one professional Instagram reel." className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-blue-400" />
                          <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Scope / quantity</label><input value={item.scope} onChange={(e) => updatePackage(item.id, "scope", e.target.value)} placeholder="1 reel up to 60 seconds" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-blue-400" />
                          <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-400">What's included</label><textarea value={item.includes} onChange={(e) => updatePackage(item.id, "includes", e.target.value)} rows={3} placeholder="Captions, color correction, 1080p export..." className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-blue-400" />
                          <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Price (INR)</label><input type="text" inputMode="numeric" pattern="[0-9]*" value={item.price} onChange={(e) => updatePackage(item.id, "price", e.target.value.replace(/\D/g, ""))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-black outline-none focus:border-blue-400" />
                          <div className="mt-3 grid grid-cols-2 gap-2"><div><label className="text-[10px] font-bold text-slate-400">Delivery days</label><input type="text" inputMode="numeric" pattern="[0-9]*" value={item.deliveryDays} onChange={(e) => updatePackage(item.id, "deliveryDays", e.target.value.replace(/\D/g, ""))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none" /></div><div><label className="text-[10px] font-bold text-slate-400">Revisions</label><input type="text" inputMode="numeric" pattern="[0-9]*" value={item.revisions} onChange={(e) => updatePackage(item.id, "revisions", e.target.value.replace(/\D/g, ""))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none" /></div></div>
                        </div>)}</div>
                      </div> })()}
                    </>
                  )}
                </section>
              </>}
            </div>

            <aside className="h-fit space-y-4 lg:sticky lg:top-28"><div className="premium-card overflow-hidden"><div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-6 text-white"><p className="text-xs font-bold uppercase tracking-widest text-blue-100">Live preview</p><div className="mt-5 flex items-center gap-3">{avatarUrl ? <img src={avatarUrl} alt="" className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white/30" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-xl font-black">{fullName.charAt(0).toUpperCase() || "Y"}</div>}<div className="min-w-0"><p className="truncate font-black">{fullName || "Your Name"}</p><p className="truncate text-xs text-blue-100">@{username || "username"}</p></div></div></div><div className="space-y-4 p-5"><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categories</p><div className="mt-2 flex flex-wrap gap-1.5">{selectedCategories.length ? selectedCategories.map((item) => <span key={item} className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">{item}</span>) : <span className="text-xs text-slate-400">No categories selected</span>}</div></div>{accountType === "freelancer" && <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">Starting from</p><p className="mt-1 text-2xl font-black">₹{Number(startingPrice || 0).toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-slate-500">{portfolio.length} portfolio {portfolio.length === 1 ? "item" : "items"}</p></div>}{accountType === "freelancer" && <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-widest text-white/50">Wallet</p><p className="mt-1 text-xl font-black">₹{Number(wallet?.available_balance || 0).toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-white/55">Available balance</p></div><Link href="/wallet" className="rounded-lg bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:bg-white/20">Open</Link></div><div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs"><span className="text-white/50">Pending</span><span className="font-bold">₹{Number(wallet?.pending_balance || 0).toLocaleString("en-IN")}</span></div></div>}</div></div></aside>
          </div>

          {(error || success) && <div className={`rounded-2xl border p-4 text-sm font-bold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error || success}</div>}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end"><Link href="/dashboard" className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-slate-500 hover:bg-white">Cancel</Link><button disabled={saving} className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60">{saving ? "Saving..." : "Save Profile →"}</button></div>
        </form>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div><label className="mb-2 block text-sm font-bold">{label}</label><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" /></div>;
}
