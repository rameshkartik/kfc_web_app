-- Order creation controls and atomic stock/slot reservation.
-- Apply after 202610250001_initial_schema.sql.
alter table public.orders add column if not exists idempotency_key uuid unique;
alter table public.orders add column if not exists reserved_until timestamptz;
alter table public.orders add column if not exists order_status_note text;
create table if not exists public.store_settings (
 key text primary key,
 value jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.store_settings enable row level security;
-- Defaults are intentionally not populated. Owner must set actual delivery rules.
create or replace function public.create_pending_order(
 p_customer_name text,
 p_phone text,
 p_address_line text,
 p_postal_code text,
 p_zone_id uuid,
 p_slot_id uuid,
 p_items jsonb,
 p_idempotency_key uuid
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
 v_existing public.orders%rowtype;
 v_zone public.delivery_zones%rowtype;
 v_slot public.delivery_slots%rowtype;
 v_variant public.product_variants%rowtype;
 v_product public.products%rowtype;
 v_customer_id uuid;
 v_order_id uuid;
 v_subtotal bigint := 0;
 v_fee bigint;
 v_price bigint;
 v_qty integer;
 v_item jsonb;
 v_cutoff timestamptz;
 v_config jsonb;
 v_taken integer;
 v_reference text;
begin
 -- This SECURITY DEFINER function is callable only by service_role.
 if length(trim(coalesce(p_customer_name,''))) < 2 or length(p_customer_name) > 120 then raise exception 'Invalid customer name'; end if;
 if p_phone !~ '^[0-9]{10}$' then raise exception 'Invalid mobile number'; end if;
 if length(trim(coalesce(p_address_line,''))) < 10 or length(p_address_line) > 500 then raise exception 'Invalid address'; end if;
 if p_postal_code !~ '^[0-9]{6}$' then raise exception 'Invalid postal code'; end if;
 if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 25 then raise exception 'Invalid cart'; end if;
 perform pg_advisory_xact_lock(hashtext(p_idempotency_key::text));
 select * into v_existing from public.orders where idempotency_key = p_idempotency_key;
 if found then
   return jsonb_build_object('order_id', v_existing.id, 'reference', v_existing.public_reference, 'amount_paise', v_existing.total_paise, 'existing', true);
 end if;
 select * into v_zone from public.delivery_zones where id=p_zone_id and active=true;
 if not found or not (p_postal_code=any(v_zone.postal_codes)) then raise exception 'Address outside active delivery zone'; end if;
 select * into v_slot from public.delivery_slots where id=p_slot_id and zone_id=p_zone_id and active=true for update;
 if not found then raise exception 'Invalid delivery slot'; end if;
 select value into v_config from public.store_settings where key='ordering_rules';
 if v_config is null or nullif(v_config->>'cutoff_hours_before','') is null then raise exception 'Ordering rules not configured'; end if;
 if v_slot.delivery_date + v_slot.start_time <= now() + make_interval(hours => (v_config->>'cutoff_hours_before')::int) then raise exception 'Delivery cutoff passed'; end if;
 select count(*) into v_taken from public.orders o
 where o.slot_snapshot->>'slot_id'=v_slot.id::text and o.payment_status in ('paid','pending_payment')
 and (o.payment_status='paid' or o.reserved_until > now());
 if v_taken >= v_slot.capacity then raise exception 'Delivery slot full'; end if;
 -- Sorted row locking reduces deadlocks for concurrent cart submissions.
 for v_item in select x from jsonb_array_elements(p_items) as x order by x->>'variant_id'
 loop
   if coalesce(v_item->>'variant_id','') !~* '^[a-f0-9-]{36}$' then raise exception 'Invalid variant'; end if;
   v_qty := (v_item->>'quantity')::integer;
   if v_qty < 1 or v_qty > 20 then raise exception 'Invalid quantity'; end if;
   select * into v_variant from public.product_variants where id=(v_item->>'variant_id')::uuid and active=true for update;
   if not found then raise exception 'Unavailable product variant'; end if;
   select * into v_product from public.products where id=v_variant.product_id and active=true;
   if not found then raise exception 'Unavailable product'; end if;
   if v_variant.available_quantity is not null and v_variant.available_quantity < v_qty then raise exception 'Not enough stock'; end if;
   v_price := v_variant.price_paise::bigint * v_qty;
   v_subtotal := v_subtotal + v_price;
 end loop;
 v_fee := v_zone.fee_paise;
 if v_subtotal + v_fee > 100000000 or v_subtotal < 1 then raise exception 'Order amount invalid'; end if;
 insert into public.customers(phone,name) values(p_phone,trim(p_customer_name)) returning id into v_customer_id;
 insert into public.addresses(customer_id,address_line,postal_code,zone_id)
 values(v_customer_id,p_address_line,p_postal_code,p_zone_id);
 v_reference := 'KFC-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
 insert into public.orders(public_reference,customer_id,address_snapshot,slot_snapshot,
 subtotal_paise,delivery_fee_paise,total_paise,idempotency_key,reserved_until)
 values(v_reference,v_customer_id,jsonb_build_object('address_line',p_address_line,'postal_code',p_postal_code,'zone',v_zone.name),
 jsonb_build_object('slot_id',v_slot.id,'date',v_slot.delivery_date,'start',v_slot.start_time,'end',v_slot.end_time,'zone',v_zone.name),
 v_subtotal,v_fee,v_subtotal+v_fee,p_idempotency_key,now()+ interval '15 minutes') returning id into v_order_id;
 for v_item in select x from jsonb_array_elements(p_items) as x order by x->>'variant_id' loop
   v_qty := (v_item->>'quantity')::integer;
   select * into v_variant from public.product_variants where id=(v_item->>'variant_id')::uuid;
   select * into v_product from public.products where id=v_variant.product_id;
   insert into public.order_items(order_id,product_snapshot,unit_price_paise,quantity,line_total_paise)
   values(v_order_id,jsonb_build_object('name',v_product.name,'slug',v_product.slug,'cut',v_variant.cut_type,'weight_grams',v_variant.weight_grams),
    v_variant.price_paise,v_qty,v_variant.price_paise*v_qty);
 end loop;
 insert into public.order_status_history(order_id,new_status) values(v_order_id,'created');
 return jsonb_build_object('order_id',v_order_id,'reference',v_reference,'amount_paise',v_subtotal+v_fee,'existing',false);
end;
$$;
revoke execute on function public.create_pending_order(text,text,text,text,uuid,uuid,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.create_pending_order(text,text,text,text,uuid,uuid,jsonb,uuid) to service_role;
