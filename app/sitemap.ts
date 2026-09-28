import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
export default async function sitemap(): Promise<MetadataRoute.Sitemap>{
 const base="https://igtrendy.in";
 const staticPaths=["/","/trending","/prompts","/category/gaming","/category/movies","/category/web-series","/category/events","/category/theories","/category/explained"];
 const {data}=await supabase.from("articles").select("slug,updated_at,published_at").eq("status","published").limit(5000);
 const {data:prompts}=await supabase.from("prompts").select("id,created_at").eq("status","published").limit(5000);
 return [...staticPaths.map(path=>({url:base+path,lastModified:new Date()})),...(data??[]).map(a=>({url:`${base}/article/${a.slug}`,lastModified:new Date(a.updated_at||a.published_at||Date.now())})),...(prompts??[]).map(p=>({url:`${base}/prompt/${p.id}`,lastModified:new Date(p.created_at)}))];
}
