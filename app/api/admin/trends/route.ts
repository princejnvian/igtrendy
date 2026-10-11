import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/server";

export const maxDuration = 120;

type Signal = { title:string; link:string; pubDate:string; description:string; region:string };
const ALLOWED_CATEGORIES = ["Gaming","Sports","Cricket","IPL","Football","Tennis","Esports","Stock Market","Indian Stocks","Global Markets","Crypto","Bollywood","Hollywood","Movies","Web Series","Events","Theories","Explained","Trending","News"];

function decodeXml(value:string){return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");}

async function fetchGoogleNews(query:string, region:string, gl:string, hl:string, ceid:string):Promise<Signal[]>{
  const url=`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${encodeURIComponent(hl)}&gl=${encodeURIComponent(gl)}&ceid=${encodeURIComponent(ceid)}`;
  try{
    const response=await fetch(url,{cache:"no-store",headers:{"User-Agent":"IGTrendyNewsScanner/1.0"}});
    if(!response.ok) return [];
    const xml=await response.text();
    const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m=>m[1]);
    return items.slice(0,10).map(item=>{
      const get=(tag:string)=>decodeXml(item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`,"i"))?.[1]||"").trim();
      return {title:get("title"),link:get("link"),pubDate:get("pubDate"),description:get("description").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(),region};
    }).filter(x=>x.title&&x.link);
  }catch{return []}
}

function inferCategory(signal:Signal){
  const text=(signal.title+" "+signal.description).toLowerCase();
  if(/\b(ipl|indian premier league|ipl auction|ipl mega auction)\b/.test(text)) return "IPL";
  if(/\b(cricket|bcci|test match|odi|t20|wicket|run chase|world cup cricket|icc champions trophy)\b/.test(text)) return "Cricket";
  if(/\b(football|soccer|premier league|champions league|la liga|bundesliga|serie a|fifa|uefa|transfer window|transfer news)\b/.test(text)) return "Football";
  if(/\b(tennis|wimbledon|us open|french open|australian open|atp tour|wta tour)\b/.test(text)) return "Tennis";
  if(/\b(esports|e-sports|valorant champions|league of legends|counter-strike|cs2 tournament|dota 2|esl pro league)\b/.test(text)) return "Esports";
  if(/\b(stock market|share market|nifty|sensex|bse|nse|indian stocks|rupee|rbi policy|rbi rate|indian equities|midcap|smallcap)\b/.test(text) && signal.region==="India") return "Indian Stocks";
  if(/\b(stock market|wall street|nasdaq|s&p 500|dow jones|federal reserve|fed rate|treasury yield|global markets|equities|stocks rally|stocks fall)\b/.test(text)) return "Global Markets";
  if(/\b(bitcoin|btc|ethereum|ether|crypto|cryptocurrency|solana|xrp|binance|stablecoin|blockchain)\b/.test(text)) return "Crypto";
  if(/\b(bollywood|hindi cinema|hindi film|shah rukh|salman khan|aamir khan|deepika padukone|ranbir kapoor|box office india|tollywood|indian cinema)\b/.test(text)) return "Bollywood";
  if(/\b(hollywood|oscars|academy awards|warner bros|universal pictures|paramount pictures|sony pictures|marvel studios|dc studios)\b/.test(text)) return "Hollywood";
  if(/\b(gta|playstation|xbox|nintendo|gaming|video game|gameplay|game release|game studio|steam|switch|fortnite|minecraft|pokemon|esports)\b/.test(text)) return "Gaming";
  if(/\b(netflix|prime video|disney\+|hbo|web series|series|season|episode|streaming)\b/.test(text)) return "Web Series";
  if(/\b(movie|film|trailer|casting|box office|actor|actress|cinema)\b/.test(text)) return "Movies";
  if(/\b(award|festival|event|concert|premiere|ceremony)\b/.test(text)) return "Events";
  if(/\b(theory|mystery|explained|simulation|conspiracy|ai|artificial intelligence)\b/.test(text)) return "Theories";
  if(/\b(sports|sport|olympics|athletics|formula 1|f1|nba|basketball|badminton|hockey|rugby|golf)\b/.test(text)) return "Sports";
  if(["India","United States","Europe"].includes(signal.region)) return "News";
  return "Trending";
}

function signalScore(signal:Signal, all:Signal[]){
  const text=`${signal.title} ${signal.description}`.toLowerCase(); let score=50;
  const published=Date.parse(signal.pubDate); if(Number.isFinite(published)){const hours=Math.max(0,(Date.now()-published)/36e5); if(hours<=6)score+=30;else if(hours<=12)score+=24;else if(hours<=24)score+=18;else if(hours<=36)score+=10;else if(hours<=48)score+=3;else score-=25;}
  for(const term of ["breaking","announced","official","launch","released","release date","trailer","new","update","revealed","confirmed","premiere","returns","record","major","first look","gameplay","coming","debut"]) if(text.includes(term)) score+=3;
  for(const term of ["rumor","rumour","leak","alleged","possibly","might"]) if(text.includes(term)) score-=4;
  const words=new Set(signal.title.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(w=>w.length>=5)); let related=0;
  for(const other of all){if(other===signal)continue;const ow=new Set(other.title.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(w=>w.length>=5));let overlap=0;for(const w of words)if(ow.has(w))overlap++;if(overlap>=2)related++;}
  score+=Math.min(15,related*4); return Math.max(1,Math.min(100,score));
}

const TITLE_STOP_WORDS = new Set(["about","after","again","amid","among","and","are","around","before","being","best","between","breaking","but","could","does","down","during","from","have","here","how","into","just","latest","more","most","new","news","over","says","that","their","them","then","there","these","this","those","through","today","tomorrow","update","updates","using","what","when","where","which","while","with","will","your"]);

function titleTokens(value:string){
  return new Set(value.toLowerCase()
    .replace(/&/g," and ")
    .replace(/[^a-z0-9\s]/g," ")
    .split(/\s+/)
    .filter(word=>word.length>=3&&!TITLE_STOP_WORDS.has(word)));
}

function similarity(a:string,b:string){
  const aa=titleTokens(a), bb=titleTokens(b);
  if(!aa.size||!bb.size)return 0;
  let overlap=0;
  for(const word of aa)if(bb.has(word))overlap++;
  const containment=overlap/Math.min(aa.size,bb.size);
  const jaccard=overlap/Math.max(1,aa.size+bb.size-overlap);
  return overlap>=3&&containment>=0.7&&(jaccard>=0.38||overlap>=5)?containment:0;
}

function buildLocalTrends(signals:Signal[]){
  const ranked=signals
    .map(signal=>({signal,score:signalScore(signal,signals)}))
    .filter(x=>Date.now()-Date.parse(x.signal.pubDate)<=48*36e5 || !Number.isFinite(Date.parse(x.signal.pubDate)))
    .sort((a,b)=>b.score-a.score);

  const candidates:any[]=[];
  for(const {signal,score} of ranked){
    const title=signal.title.replace(/\s+-\s+[^-]+$/," ").trim()||signal.title;
    if(candidates.some(item=>similarity(item.title,title)>=0.7))continue;
    const category=inferCategory(signal);
    const date=Date.parse(signal.pubDate);
    const fresh=Number.isFinite(date)?`Fresh signal from ${signal.region} Google News (${new Date(date).toUTCString()}).`:`Fresh signal from ${signal.region} Google News.`;
    const snippet=signal.description?` ${signal.description.slice(0,420)}`:"";
    candidates.push({title,category,why_now:(fresh+snippet).slice(0,700),trend_score:score,source_urls:[signal.link]});
  }

  // Keep a larger ranked candidate pool so database-level duplicate checks
  // can reject old topics and still fall back to genuinely fresh News stories.
  const selected:any[]=[];
  const categoryCounts=new Map<string,number>();
  const addCandidate=(candidate:any,limit:number)=>{
    if(selected.length>=30)return;
    if((categoryCounts.get(candidate.category)||0)>=limit)return;
    if(selected.some(item=>similarity(item.title,candidate.title)>=0.7))return;
    selected.push(candidate);
    categoryCounts.set(candidate.category,(categoryCounts.get(candidate.category)||0)+1);
  };
  for(const candidate of candidates.filter(item=>item.category!=="News"))addCandidate(candidate,3);
  for(const candidate of candidates.filter(item=>item.category==="News"))addCandidate(candidate,30);
  return selected;
}

async function scanTrends(db:any,bypassDailyLimit=false){
  const today=new Date().toISOString().slice(0,10); const {data:usage}=await db.from("ai_usage_daily").select("trend_scan_count").eq("usage_date",today).maybeSingle(); const maxScans=Number(process.env.DAILY_TREND_SCAN_LIMIT||2);
  if(!bypassDailyLimit&&(usage?.trend_scan_count||0)>=maxScans)throw new Error(`Daily trend scan limit reached (${maxScans}).`);
  const q=(text:string)=>`${text} when:2d`;
  const feeds=[
    [q("India latest news breaking politics business technology entertainment sports"),"India","IN","en-IN","IN:en"],
    [q("India national news latest government economy technology"),"India","IN","en-IN","IN:en"],
    [q("United States latest news breaking politics business technology entertainment sports"),"United States","US","en-US","US:en"],
    [q("US America latest news breaking technology business culture"),"United States","US","en-US","US:en"],
    [q("Europe latest news breaking politics business technology culture"),"Europe","GB","en-GB","GB:en"],
    [q("UK Germany France Europe latest news breaking"),"Europe","GB","en-GB","GB:en"],
    [q("gaming GTA Nintendo PlayStation Xbox game release update"),"Entertainment","US","en-US","US:en"],
    [q("sports latest results fixtures transfer news football tennis basketball Formula 1"),"Entertainment","US","en-US","US:en"],
    [q("cricket latest news ICC India team match result"),"India","IN","en-IN","IN:en"],
    [q("IPL Indian Premier League latest team auction news"),"India","IN","en-IN","IN:en"],
    [q("football soccer Premier League Champions League transfer news"),"Entertainment","GB","en-GB","GB:en"],
    [q("Indian stock market Nifty Sensex NSE BSE company earnings"),"India","IN","en-IN","IN:en"],
    [q("US stock market Wall Street Nasdaq S&P 500 earnings Fed"),"United States","US","en-US","US:en"],
    [q("global markets stocks bonds commodities economy latest"),"Europe","GB","en-GB","GB:en"],
    [q("Bitcoin Ethereum cryptocurrency crypto market regulation"),"United States","US","en-US","US:en"],
    [q("Bollywood Hindi cinema movie release box office actor actress"),"India","IN","en-IN","IN:en"],
    [q("Hollywood movie studio trailer casting box office Oscars"),"United States","US","en-US","US:en"],
    [q("movies Hollywood Netflix Marvel DC trailer release casting"),"Entertainment","US","en-US","US:en"],
    [q("web series Netflix Prime Video Disney HBO trailer release"),"Entertainment","US","en-US","US:en"],
    [q("viral entertainment events awards festival pop culture"),"Entertainment","US","en-US","US:en"],
    [q("internet technology AI mystery explained trend"),"Entertainment","US","en-US","US:en"]
  ];
  const batches=await Promise.all(feeds.map(x=>fetchGoogleNews(x[0] as string,x[1] as string,x[2] as string,x[3] as string,x[4] as string)));
  const cutoff=Date.now()-48*36e5; const all=batches.flat().filter(x=>{const t=Date.parse(x.pubDate);return !Number.isFinite(t)||t>=cutoff;});
  const unique=Array.from(new Map(all.map(x=>[`${x.link}|${x.title.toLowerCase()}`,x])).values());
  if(!unique.length)throw new Error("No fresh news signals were found in the last 48 hours.");
  const trends=buildLocalTrends(unique); if(!trends.length)throw new Error("No fresh, sufficiently distinct trends were found.");
  const rows=trends.map((t:any)=>{const topic=String(t.title).trim();const slug=topic.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g,"").trim().replace(/[\s_-]+/g,"-").slice(0,90);return{topic,slug,category:ALLOWED_CATEGORIES.includes(t.category)?t.category:"Trending",why_now:String(t.why_now||""),trend_score:Math.max(1,Math.min(100,Number(t.trend_score)||50)),source_urls:(t.source_urls||[]).filter((u:any)=>typeof u==="string"&&/^https?:\/\//i.test(u)).slice(0,8),status:"queued",scanned_at:new Date().toISOString()};});
  const {data:existing,error:existingError}=await db.from("trend_queue").select("id,topic,slug,status,source_urls").limit(2000);
  if(existingError)throw new Error(`Existing trend lookup failed: ${existingError.message}`);
  const existingRows=existing||[];
  const {data:publishedArticles,error:publishedArticlesError}=await db.from("articles").select("title").eq("status","published").limit(2000);
  if(publishedArticlesError)throw new Error(`Published article lookup failed: ${publishedArticlesError.message}`);
  const publishedTitles=(publishedArticles||[]).map((item:any)=>String(item.title||"")).filter(Boolean);
  const publishedSources=new Set(existingRows.filter((r:any)=>r.status==="published").flatMap((r:any)=>Array.isArray(r.source_urls)?r.source_urls:[]));
  const safeRows:any[]=[];
  const refreshedIds=new Set<string>();
  let refreshed=0;

  for(const row of rows){
    const source=Array.isArray(row.source_urls)?row.source_urls[0]:null;
    if(source&&publishedSources.has(source))continue;
    if(publishedTitles.some((title:string)=>similarity(title,row.topic)>=0.7))continue;
    if(existingRows.some((item:any)=>item.status==="published"&&similarity(String(item.topic||""),row.topic)>=0.7))continue;
    if(existingRows.some((item:any)=>item.status==="processing"&&similarity(String(item.topic||""),row.topic)>=0.7))continue;

    const match=existingRows.find((item:any)=>item.status==="queued"&&similarity(String(item.topic||""),row.topic)>=0.7);
    if(!match){
      safeRows.push(row);
      continue;
    }
    if(!refreshedIds.has(match.id)){
      const {error:updateError}=await db.from("trend_queue").update({
        topic:row.topic,
        slug:row.slug,
        category:row.category,
        why_now:row.why_now,
        trend_score:row.trend_score,
        source_urls:row.source_urls,
        status:"queued",
        scanned_at:row.scanned_at
      }).eq("id",match.id);
      if(updateError)throw new Error(`Queued trend refresh failed: ${updateError.message}`);
      refreshedIds.add(match.id);
      refreshed++;
    }
    if(safeRows.length+refreshed>=10)break;
  }

  let inserted:any[]=[];
  if(safeRows.length){
    const {data,error}=await db.from("trend_queue").insert(safeRows).select("id,topic,slug,category,why_now,trend_score,source_urls,status,created_at,scanned_at");
    if(error)throw new Error(`Trend queue save failed: ${error.message}`);
    inserted=data||[];
  }
  if(!inserted.length&&!refreshed)return{count:0,inserted:0,refreshed:0,signals:unique.length,model:"google-news-rss-local-ranker",message:"Fresh signals were found, but they matched already-published or non-queued topics."};

  const {error:usageError}=await db.rpc("record_ai_usage",{p_kind:"trend_scan"});
  if(usageError)console.error("AI usage counter update failed:",usageError.message);
  return{count:inserted.length+refreshed,inserted:inserted.length,refreshed,signals:unique.length,model:"google-news-rss-local-ranker",message:"Fresh regional signals queued or refreshed."};
}

function cronAuthorized(request:Request){const secret=process.env.CRON_SECRET||"";return!!secret&&(request.headers.get("authorization")===`Bearer ${secret}`||request.headers.get("x-cron-secret")===secret);}

export async function GET(request:Request){try{const isCron=cronAuthorized(request);const db=isCron?serviceClient():(await requireAdmin(request)).client;return NextResponse.json({ok:true,...await scanTrends(db,isCron)});}catch(e:any){return NextResponse.json({error:e.message||"Trend scan failed."},{status:e.message?.includes("Admin")||e.message?.includes("Authentication")?403:500});}}
export async function POST(request:Request){try{const isCron=cronAuthorized(request);const db=isCron?serviceClient():(await requireAdmin(request)).client;return NextResponse.json({ok:true,...await scanTrends(db,isCron)});}catch(e:any){return NextResponse.json({error:e.message||"Trend scan failed."},{status:e.message?.includes("Admin")||e.message?.includes("Authentication")?403:500});}}
