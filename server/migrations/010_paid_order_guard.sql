-- A paid order is a derived state: it is valid only when a paid payment exists.
-- This guard covers direct API/database attempts to mark an order paid before a payment
-- has been recorded. Legitimate payment flow inserts the payment first, then marks the order paid.

create or replace function nexora_guard_paid_order()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'paid'
     and not exists (
       select 1
       from payments p
       where p.order_id = new.id
         and p.status = 'paid'
     ) then
    new.status := 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_paid_state_guard on orders;

create trigger orders_paid_state_guard
before insert or update of status on orders
for each row
execute function nexora_guard_paid_order();
