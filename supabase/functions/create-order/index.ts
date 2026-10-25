import { adminClient, headers, json } from "../_shared/helpers.ts";
// Deploy with Supabase Edge Functions. Add gateway controls and IP-based rate limiting before public launch.
Deno.serve(async (req) => {
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers});
  if(req.method!=="POST") return json({error:"Method not allowed"},405);
  try {
    const key=Deno.env.get("RAZORPAY_KEY_ID"), secret=Deno.env.get("RAZORPAY_KEY_SECRET");
    if(!key || !secret) return json({error:"Payments not configured"},503);
    const body=await req.json();
    if(!body || !Array.isArray(body.items) || body.items.length>25 || typeof body.customer_name!=="string"
     || typeof body.phone!=="string" || typeof body.address_line!=="string" || typeof body.postal_code!=="string"
     || !/^[a-f0-9-]{36}$/i.test(body.idempotency_key||"")
     || !/^[a-f0-9-]{36}$/i.test(body.zone_id||"") || !/^[a-f0-9-]{36}$/i.test(body.slot_id||"")) return json({error:"Invalid request"},400);
    const db=adminClient();
    const {data,error}=await db.rpc("create_pending_order",{
      p_customer_name:body.customer_name,p_phone:body.phone,p_address_line:body.address_line,
      p_postal_code:body.postal_code,p_zone_id:body.zone_id,p_slot_id:body.slot_id,
      p_items:body.items,p_idempotency_key:body.idempotency_key
    });
    if(error) return json({error:error.message},422);
    // Idempotency: reuse existing provider order when retrying.
    const {data:existing}=await db.from("payments").select("provider_order_id").eq("order_id",data.order_id).eq("provider","razorpay").maybeSingle();
    if(existing?.provider_order_id) return json({reference:data.reference,provider_order_id:existing.provider_order_id,key_id:key,amount_paise:data.amount_paise});
    const auth=btoa(key+":"+secret);
    const response=await fetch("https://api.razorpay.com/v1/orders",{
      method:"POST",headers:{"Authorization":"Basic "+auth,"Content-Type":"application/json"},
      body:JSON.stringify({amount:data.amount_paise,currency:"INR",receipt:data.reference,notes:{internal_order_id:data.order_id}})
    });
    if(!response.ok) return json({error:"Payment provider unavailable; your order is not confirmed",reference:data.reference},502);
    const provider=await response.json();
    const {error:paymentError}=await db.from("payments").insert({order_id:data.order_id,provider:"razorpay",provider_order_id:provider.id,
      amount_paise:data.amount_paise,status:"created"});
    if(paymentError) return json({error:"Payment initialization incomplete; contact support before retrying",reference:data.reference},503);
    return json({reference:data.reference,provider_order_id:provider.id,key_id:key,amount_paise:data.amount_paise});
  } catch (err) { console.error("create-order failure",err instanceof Error?err.name:"unknown"); return json({error:"Unable to create order"},500); }
});
