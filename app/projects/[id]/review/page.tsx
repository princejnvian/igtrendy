import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewForm from "./ReviewForm";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const { data: project } = await supabase.from("projects").select("id,title,client_id,freelancer_id,status").eq("id", id).maybeSingle();
  if (!project) notFound();
  if (project.client_id !== user.id) redirect(`/projects/${id}`);
  const { data: existing } = await supabase.from("reviews").select("rating,comment,created_at").eq("project_id", id).maybeSingle();
  return <main className="min-h-screen youtent-app-bg text-slate-950"><div className="mx-auto max-w-2xl px-5 py-12"><Link href={`/projects/${id}`} className="text-sm font-bold text-slate-500 hover:text-blue-600">← Back to project</Link><div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/40 sm:p-10"><p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Project complete</p><h1 className="mt-2 text-3xl font-black">How was your experience?</h1><p className="mt-3 text-sm leading-6 text-slate-500">Your review helps this freelancer build a trusted reputation on YOUTENT.</p>{existing ? <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-5"><p className="font-black text-emerald-800">Review submitted</p><p className="mt-2 text-sm text-emerald-700">Rating: {existing.rating}/5</p>{existing.comment && <p className="mt-2 text-sm text-emerald-700">{existing.comment}</p>}</div> : <ReviewForm projectId={id} />}</div></div></main>;
}
