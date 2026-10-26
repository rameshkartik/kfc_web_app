-- Kovai Fresh Cuts: confirmed Sunday pre-order policy.
-- Timezone Asia/Kolkata (IST, UTC+05:30).
-- Saturday 18:00 IST cutoff; Sunday delivery 07:00-12:00 IST.
-- SHARED maximum 50 orders across all zones per Sunday.
-- Apply after the initial schema and order-creation migrations.
begin;

insert into public.store_settings(key,value)
values ('ordering_rules',jsonb_build_object(
  'timezone','Asia/Kolkata','delivery_days',jsonb_build_array(7),
  'cutoff_day','Saturday','cutoff_time','18:00',
  'cutoff_hours_before',13,
  'delivery_start','07:00','delivery_end','12:00',
  'max_orders_per_delivery_day',50
))
on conflict(key) do update set value =
  (case when jsonb_typeof(public.store_settings.value)='object'
    then public.store_settings.value else '{}'::jsonb end)
  || excluded.value, updated_at=now();

-- Existing order RPC uses cutoff_hours_before=13 relative to 07:00 start.
-- Interpret its local slot timestamp as IST, rather than the default UTC.
alter function public.create_pending_order(text,text,text,text,uuid,uuid,jsonb,uuid)
  set timezone = 'Asia/Kolkata';

-- Invalidate previously configured slots that do not match the exact window.
update public.delivery_slots set active=false
where active and (
  extract(isodow from delivery_date) <> 7
  or start_time <> time '07:00'
  or end_time <> time '12:00'
);

create or replace function public.enforce_sunday_delivery_slot()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.active and (
    extract(isodow from new.delivery_date) <> 7
    or new.start_time <> time '07:00'
    or new.end_time <> time '12:00'
  ) then
    raise exception 'Only Sunday 07:00-12:00 IST delivery slots can be active';
  end if;
  -- A slot cap cannot exceed the business-wide daily cap.
  if new.capacity > 50 then
    raise exception 'Per-slot capacity cannot exceed 50';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_sunday_delivery_slot on public.delivery_slots;
create trigger trg_sunday_delivery_slot
before insert or update on public.delivery_slots
for each row execute function public.enforce_sunday_delivery_slot();

-- 50 is a total Sunday order cap, NOT 50 orders per delivery area.
-- Pending orders count only while their reservation is valid.
-- A date-scoped transaction advisory lock serializes inserts across zones.
create or replace function public.enforce_sunday_order()
returns trigger language plpgsql set search_path=public as $$
declare
  delivery_day date;
  cutoff_at timestamptz;
  already_booked integer;
begin
  if not (new.slot_snapshot ? 'date' and new.slot_snapshot ? 'start'
    and new.slot_snapshot ? 'end') then
    raise exception 'Delivery date and window are required';
  end if;

  delivery_day := (new.slot_snapshot->>'date')::date;
  if extract(isodow from delivery_day) <> 7
     or (new.slot_snapshot->>'start')::time <> time '07:00'
     or (new.slot_snapshot->>'end')::time <> time '12:00' then
    raise exception 'Sunday 07:00-12:00 IST delivery only';
  end if;

  cutoff_at := ((delivery_day - 1) + time '18:00') at time zone 'Asia/Kolkata';
  if now() >= cutoff_at then
    raise exception 'Saturday 18:00 IST preorder cutoff has passed';
  end if;

  -- Fixed namespace 24050; lock key based on delivery date.
  perform pg_advisory_xact_lock(24050, (delivery_day - date '2000-01-01')::int);
  select count(*) into already_booked from public.orders o
  where (o.slot_snapshot->>'date')::date = delivery_day
    and o.id is distinct from new.id
    and (o.payment_status='paid'
      or (o.payment_status='pending_payment' and o.reserved_until > now()));
  if already_booked >= 50 then
    raise exception 'Sunday order capacity reached (50 orders)';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_sunday_order on public.orders;
create trigger trg_sunday_order
before insert or update of slot_snapshot on public.orders
for each row execute function public.enforce_sunday_order();

-- Publish eight upcoming Sunday windows in each already-active delivery zone.
-- This is an initial booking horizon; schedule future slots separately.
-- No price, delivery fee or postal-code coverage is modified.
insert into public.delivery_slots(
  delivery_date,start_time,end_time,zone_id,capacity,active
)
select (date_trunc('week',now() at time zone 'Asia/Kolkata')::date + 6 + 7*n)::date,
  time '07:00',time '12:00',z.id,50,true
from generate_series(0,7) as n
cross join public.delivery_zones z
where z.active = true
and now() < (
  ((date_trunc('week',now() at time zone 'Asia/Kolkata')::date + 5 + 7*n)::date
    + time '18:00') at time zone 'Asia/Kolkata'
)
on conflict (delivery_date,start_time,end_time,zone_id)
do update set capacity=50,active=true;

commit;

-- Verify after applying:
-- select key,value from public.store_settings where key='ordering_rules';
-- select delivery_date,start_time,end_time,capacity,count(*) as zone_count
-- from public.delivery_slots where active group by 1,2,3,4 order by 1;
