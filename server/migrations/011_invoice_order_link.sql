-- Link invoices directly to orders for reliable order history and reconciliation.

alter table if exists invoices
  add column if not exists order_id uuid references orders(id) on delete set null;

create index if not exists idx_invoices_order on invoices(order_id);

-- Backfill legacy order invoices created before the direct relation existed.
update invoices i
set order_id = o.id
from orders o
where i.order_id is null
  and i.description = 'Счёт по заказу ' || o.number
  and i.project_id::text = o.project_id::text
  and (i.client_id is null or i.client_id::text = o.client_id::text);
