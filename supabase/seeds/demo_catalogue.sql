-- Kovai Fresh Cuts | DEVELOPMENT DATA ONLY
-- Example amounts are NOT approved selling prices. Review and replace before launch.
-- Run after migrations 202610250001 and 202610250002.
-- Active demo products appear in the catalogue endpoint.
-- Delivery areas have NO approved PIN codes; no orders can pass serviceability validation.
-- No slots are created, so checkout cannot accept an order.
begin;
insert into public.products (slug,name,category,description,image_path,active)
values
 ('fresh-mutton','Fresh Mutton (DEMO)','mutton','TEST CATALOGUE ONLY — prices are illustrative and not for sale.','/mutton.svg',true),
 ('fresh-chicken','Fresh Chicken (DEMO)','chicken','TEST CATALOGUE ONLY — prices are illustrative and not for sale.','/chicken.svg',true)
on conflict (slug) do update set
 name=excluded.name,category=excluded.category,description=excluded.description,
 image_path=excluded.image_path,active=excluded.active;
with v(slug,cut_type,weight_grams,price_paise) as (
 values
 ('fresh-mutton','Curry cut',250,22500),
 ('fresh-mutton','Curry cut',500,45000),
 ('fresh-mutton','Curry cut',1000,90000),
 ('fresh-mutton','Boneless',250,27500),
 ('fresh-mutton','Boneless',500,55000),
 ('fresh-mutton','Boneless',1000,110000),
 ('fresh-chicken','Curry cut',250,6500),
 ('fresh-chicken','Curry cut',500,13000),
 ('fresh-chicken','Curry cut',1000,26000),
 ('fresh-chicken','Boneless',250,9500),
 ('fresh-chicken','Boneless',500,19000),
 ('fresh-chicken','Boneless',1000,38000)
)
insert into public.product_variants(product_id,cut_type,weight_grams,price_paise,available_quantity,active)
select p.id,v.cut_type,v.weight_grams,v.price_paise,null,true
from v join public.products p on p.slug=v.slug
on conflict (product_id,cut_type,weight_grams) do update
 set price_paise=excluded.price_paise,active=excluded.active,
 available_quantity=excluded.available_quantity;
insert into public.delivery_zones(name,postal_codes,fee_paise,active)
values
 ('Singanallur',array[]::text[],0,true),
 ('GV Residency',array[]::text[],0,true),
 ('Krishna Colony',array[]::text[],0,true),
 ('MGR Nagar',array[]::text[],0,true)
on conflict (name) do update set postal_codes=excluded.postal_codes,
 fee_paise=excluded.fee_paise,active=excluded.active;
commit;
-- Inspect sample catalogue entries without exposing customer/order records.
select p.name,p.slug,v.cut_type,v.weight_grams,
       v.price_paise/100.0 as demo_price_inr
from public.products p join public.product_variants v on v.product_id=p.id
where p.slug in ('fresh-mutton','fresh-chicken')
order by p.slug,v.cut_type,v.weight_grams;
