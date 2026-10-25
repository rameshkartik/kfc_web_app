import { adminClient, headers, json } from "../_shared/helpers.ts";
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response(null,{status:204,headers});
 if(req.method!=="GET") return json({error:"Method not allowed"},405);
 try {
  const db=adminClient();
  const [p,z,s]=await Promise.all([
   db.from("products").select("id,slug,name,category,description,image_path,product_variants(id,cut_type,weight_grams,price_paise,available_quantity)").eq("active",true),
   db.from("delivery_zones").select("id,name,postal_codes,fee_paise").eq("active",true),
   db.from("delivery_slots").select("id,delivery_date,start_time,end_time,zone_id,capacity").eq("active",true).gte("delivery_date",new Date().toISOString().slice(0,10))
  ]);
  if(p.error||z.error||s.error) return json({error:"Catalogue temporarily unavailable"},503);
  return json({products:p.data,zones:z.data,slots:s.data});
 } catch { return json({error:"Catalogue unavailable"},500); }
});
