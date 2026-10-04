import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/server";
export const maxDuration=300;
function authorized(request:Request){const secret=process.env.CRON_SECRET||"";return!!secret&&(request.headers.get("authorization")===`Bearer ${secret}`||request.headers.get("x-cron-secret")===secret);}
function topicKey(s:string){return s.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(w=>w.length>=5).sort().join(" ");}
function similar(a:string,b:string){const aa=new Set(topicKey(a).split(" "));const bb=new Set(topicKey(b).split(" "));let n=0;for(const w of aa)if(bb.has(w))n++;return n/Math.max(1,Math.min(aa.size,bb.size))>=0.72;}
export async function GET(request:Request){
 if(!authorized(request))return NextResponse.json({error:"Unauthorized"},{status:401});
 const startedAt=new Date().toISOString(); const base=new URL(request.url); const secret=process.env.CRON_SECRET||""; const db=serviceClient();
 try{
   const scanResponse=await fetch(`${base.origin}/api/admin/trends?source=cron`,{headers:{"x-cron-secret":secret},cache:"no-store"});
   const scanData=await scanResponse.json().catch(()=>null);
   const {data:usage}=await db.from("ai_usage_daily").select("article_count").eq("usage_date",new Date().toISOString().slice(0,10)).maybeSingle();
   const dailyLimit=Number(process.env.DAILY_ARTICLE_LIMIT||10); const remaining=Math.max(0,dailyLimit-Number(usage?.article_count||0));
   if(!remaining)return NextResponse.json({ok:true,published:0,message:"Daily article limit already reached.",scan:scanData});
   const {data:trends,error}=await db.from("trend_queue").select("id,topic,slug,category,why_now,trend_score,source_urls,status,scanned_at").eq("status","queued").gte("scanned_at",startedAt).order("trend_score",{ascending:false}).limit(Math.min(10,remaining));
   if(error)throw new Error(`Auto-publish queue read failed: ${error.message}`);
   const {data:recentArticles}=await db.from("articles").select("title,slug").eq("status","published").order("published_at",{ascending:false}).limit(1000);
   const {data:publishedTrends}=await db.from("trend_queue").select("source_urls,topic").eq("status","published").limit(2000);
   const publishedSources=new Set((publishedTrends||[]).flatMap((r:any)=>Array.isArray(r.source_urls)?r.source_urls:[]));
   const usedTitles=[...(recentArticles||[]).map((r:any)=>r.title),...(publishedTrends||[]).map((r:any)=>r.topic)];
   const selected=(trends||[]).filter((t:any)=>{const src=Array.isArray(t.source_urls)?t.source_urls:[];return !src.some((u:string)=>publishedSources.has(u))&&!usedTitles.some((title:string)=>similar(title,t.topic));}).slice(0,remaining);
   if(!selected.length)return NextResponse.json({ok:true,published:0,message:"No new, non-duplicate trends were available after today's scan.",scan:scanData});
   await db.from("trend_queue").update({status:"processing"}).in("id",selected.map((t:any)=>t.id));
   const results=await Promise.allSettled(selected.map(async(t:any)=>{
     const command=`Automatically publish one original IGTrendy article about: ${t.topic}\n\nCategory: ${t.category}\nWhy now / source context: ${t.why_now}\nSource URLs from the fresh scanner: ${JSON.stringify(t.source_urls||[])}\n\nVerify current facts with live web research when available. If this is News, report what is confirmed, who reported it, when it happened, and what remains unverified. Do not invent facts. Publish the article even if no image can be sourced; images are optional. Do not mention this automation.`;
     const response=await fetch(`${base.origin}/api/ai/command`,{method:"POST",headers:{"Content-Type":"application/json","x-cron-secret":secret},body:JSON.stringify({command,mode:"publish",sourceTrendId:t.id}),cache:"no-store"});
     const data=await response.json().catch(()=>null); if(!response.ok)throw new Error(String(data?.error||`Article generation failed (${response.status}).`)); return{trendId:t.id,topic:t.topic,article:data?.article||null};
   }));
   const published=results.filter((r:any)=>r.status==="fulfilled").map((r:any)=>r.value); const failed=results.map((r:any,i:number)=>r.status==="rejected"?{trendId:selected[i]?.id,topic:selected[i]?.topic,error:r.reason?.message||"Unknown error"}:null).filter(Boolean);
   const failedIds=failed.map((x:any)=>x.trendId).filter(Boolean); if(failedIds.length)await db.from("trend_queue").update({status:"queued"}).in("id",failedIds);
   return NextResponse.json({ok:published.length>0||failed.length===0,published:published.length,failed:failed.length,results:published,errors:failed,scan:scanData});
 }catch(e:any){return NextResponse.json({error:e.message||"Automatic publishing failed."},{status:500});}
}
