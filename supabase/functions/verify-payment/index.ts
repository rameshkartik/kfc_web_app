import { adminClient, constantTimeEqual, headers, hmacHex, json } from "../_shared/helpers.ts";
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response(null,{status:204,headers});
 if(req.method!=="POST") return json({error:"Method not allowed"},405);
 try {
  const secret=Deno.env.get("RAZORPAY_KEY_SECRET"); if(!secret) return json({error:"Payment verification not configured"},503);
  const body=await req.json();
  const order=body?.razorpay_order_id, payment=body?.razorpay_payment_id, signature=body?.razorpay_signature;
  if(typeof order!=="string" || typeof payment!=="string" || typeof signature!=="string") return json({error:"Invalid verification request"},400);
  const expected=await hmacHex(secret,order+"|"+payment);
  if(!constantTimeEqual(expected,signature)) return json({error:"Signature validation failed"},400);
  const db=adminClient();
  const {data:record,error}=await db.from("payments").select("id,order_id,amount_paise,status").eq("provider_order_id",order).maybeSingle();
  if(error || !record) return json({error:"Unknown order"},404);
  // Trust signature for authenticity but confirm captured payment state and amount via Razorpay API.
  const key=Deno.env.get("RAZORPAY_KEY_ID");if(!key)return json({error:"Payment verification unavailable"},503);
  const res=await fetch("https://api.razorpay.com/v1/payments/"+encodeURIComponent(payment),{headers:{Authorization:"Basic "+btoa(key+":"+secret)}});
  if(!res.ok) return json({error:"Payment confirmation pending"},202);
  const provider=await res.json();
  if(provider.order_id!==order || provider.amount!==record.amount_paise || provider.currency!=="INR" || provider.status!=="captured") return json({error:"Payment not captured or amount mismatch"},409);
  await db.from("payments").update({provider_payment_id:payment,status:"captured",verified_at:new Date().toISOString()}).eq("id",record.id);
  const {error:orderError}=await db.from("orders").update({payment_status:"paid",fulfillment_status:"confirmed"}).eq("id",record.order_id).eq("payment_status","pending_payment");
  if(orderError) return json({error:"Payment captured, order confirmation pending reconciliation"},202);
  await db.from("order_status_history").insert({order_id:record.order_id,old_status:"created",new_status:"confirmed"});
  return json({status:"confirmed"});
 } catch {return json({error:"Unable to verify payment"},500);}
});
