-- Sunday-only pre-orders (ISO weekday 7 = Sunday).
-- Deliberately does not invent cutoff hours, slot windows, delivery fees or capacity.
-- Run AFTER 202610250001_initial_schema.sql and 202610250002_order_creation.sql.
begin;

-- Preserve existing cutoff configuration, if any. Otherwise leave it unset:
-- create_pending_order will reject checkout until an owner-approved cutoff is set.
insert into public.store_settings(key,value)
values ('ordering_rules', '{"timezone":"Asia/Kolkata","delivery_days":[7]}'::jsonb)
on conflict(key) do update
set value = (case
  when jsonb_typeof(public.store_settings.value) = 'object' then public.store_settings.value
  else '{}'::jsonb end) || '{"timezone":"Asia/Kolkata","delivery_days":[7]}'::jsonb,
updated_at=now();

-- Previously created weekday slots must not remain bookable.
update public.delivery_slots
set active=false
where extract(isodow from delivery_date) <> 7 and active=true;

-- Database-enforced Sunday-only rule for active delivery slots.
create or replace function public.enforce_sunday_delivery_slot()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.active and extract(isodow from new.delivery_date) <> 7 then
    raise exception 'Only Sunday delivery slots can be activated';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sunday_delivery_slot on public.delivery_slots;
create trigger trg_sunday_delivery_slot
before insert or update on public.delivery_slots
for each row execute function public.enforce_sunday_delivery_slot();

-- Prevent the order RPC from using an old/non-Sunday slot even if it is
-- inadvertently reactivated by an administrative change.
create or replace function public.enforce_sunday_order()
returns trigger language plpgsql set search_path = public as $$
declare v_slot_date date;
begin
  if new.slot_snapshot ? 'date' then
    v_slot_date := (new.slot_snapshot->>'date')::date;
    if extract(isodow from v_slot_date) <> 7 then
      raise exception 'Orders can be scheduled only for Sundays';
    end if;
  else
    raise exception 'Order must have a delivery date';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_sunday_order on public.orders;
create trigger trg_sunday_order before insert or update of slot_snapshot on public.orders
for each row execute function public.enforce_sunday_order();

commit;

-- Owner must choose cutoff hours and individual Sunday delivery slots before checkout.
-- Example AFTER confirming the policy (do not run this example as-is):
-- update public.store_settings
-- set value = jsonb_set(value,'{cutoff_hours_before}','12'::jsonb)
-- where key='ordering_rules';
