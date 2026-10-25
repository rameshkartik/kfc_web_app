import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
export const headers = { "Access-Control-Allow-Origin": Deno.env.get("SITE_ORIGIN") || "http://localhost:5173", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
export function json(value: unknown, status=200) { return new Response(JSON.stringify(value), {status, headers: {...headers, "Content-Type":"application/json", "Cache-Control":"no-store"}}); }
export function adminClient() {
  const url=Deno.env.get("SUPABASE_URL"), key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url || !key) throw Error("Supabase backend not configured");
  return createClient(url,key,{auth:{persistSession:false}});
}
export async function hmacHex(secret:string, message:string) {
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signature=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature)).map(x=>x.toString(16).padStart(2,"0")).join("");
}
export function constantTimeEqual(a:string,b:string) {
  if(a.length!==b.length) return false;
  let diff=0; for(let i=0;i<a.length;i++) diff |= a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
