"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminArticlePreview(){
  const params=useParams<{id:string}>();
  const [article,setArticle]=useState<any|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{(async()=>{try{const {data}=await supabase.auth.getSession();if(!data.session) throw new Error("Please sign in as admin.");const r=await fetch(`/api/admin/articles/${params.id}`,{headers:{Authorization:`Bearer ${data.session.access_token}`},cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error||"Preview failed.");setArticle(j.article)}catch(e:any){setError(e.message||"Preview failed.")}})()},[params.id]);
  if(error)return <main className="site-shell"><div className="admin-loading"><h1>Preview unavailable</h1><p>{error}</p></div></main>;
  if(!article)return <main className="site-shell"><div className="admin-loading"><p>Loading preview…</p></div></main>;
  return <main className="site-shell"><div style={{position:"sticky",top:0,zIndex:5,background:"#0b0e14",borderBottom:"1px solid var(--line)",padding:"12px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}><b>👁️ Admin preview · {article.status}</b><span style={{color:"#aab2c2",fontSize:12}}>This preview can show drafts before publishing.</span></div><article className="article-page"><span className="article-category">{article.category}</span><h1>{article.title}</h1><p className="article-excerpt">{article.excerpt}</p><div className="article-meta">Preview · {article.views||0} views</div>{article.cover_image_url&&<img className="article-cover" src={article.cover_image_url} alt="Cover"/>}<div className="article-content" dangerouslySetInnerHTML={{__html:article.content_html||""}}/>{article.article_sources?.length?<section className="sources"><h3>Sources</h3><ul>{article.article_sources.map((s:any)=><li key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.title||s.url}</a></li>)}</ul></section>:null}</article></main>
}
