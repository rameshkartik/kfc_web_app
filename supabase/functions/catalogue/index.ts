import { adminClient } from "../_shared/helpers.ts";

// Reflect only explicitly permitted development origins or the deployed production origin.
const allowed = new Set(["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"]);
const configuredOrigin = Deno.env.get("SITE_ORIGIN");
if (configuredOrigin) allowed.add(configuredOrigin);

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const cors = new Headers({
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
    "Cache-Control": "no-store"
  });
  if (origin && allowed.has(origin)) cors.set("Access-Control-Allow-Origin", origin);
  const reply = (data: unknown, status = 200) => {
    const h = new Headers(cors);
    h.set("Content-Type", "application/json");
    return new Response(JSON.stringify(data), { status, headers: h });
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "GET") return reply({ error: "Method not allowed" }, 405);
  try {
    const db = adminClient();
    const [products, zones, slots] = await Promise.all([
      db.from("products").select("id,slug,name,category,description,image_path,product_variants(id,cut_type,weight_grams,price_paise,available_quantity)").eq("active", true),
      db.from("delivery_zones").select("id,name,postal_codes,fee_paise").eq("active", true),
      db.from("delivery_slots").select("id,delivery_date,start_time,end_time,zone_id,capacity").eq("active", true).gte("delivery_date", new Date().toISOString().slice(0, 10))
    ]);
    if (products.error || zones.error || slots.error) return reply({ error: "Catalogue temporarily unavailable" }, 503);
    const sundaySlots = (slots.data || []).filter(slot => new Date(slot.delivery_date + "T12:00:00Z").getUTCDay() === 0);
    return reply({ products: products.data, zones: zones.data, slots: sundaySlots });
  } catch {
    return reply({ error: "Catalogue unavailable" }, 500);
  }
});
