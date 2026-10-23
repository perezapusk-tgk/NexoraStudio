-- Nexora Studio data-integrity constraints
-- Defense in depth: application validation remains the primary UX layer,
-- while PostgreSQL rejects malformed financial state from any client.

do $$ begin
  alter table catalog_items add constraint catalog_items_price_range_chk
    check (price is null or (price >= 0 and price <= 100000000));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table orders add constraint orders_total_range_chk
    check (total > 0 and total <= 100000000);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table invoices add constraint invoices_amount_range_chk
    check (amount > 0 and amount <= 100000000);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table payments add constraint payments_amount_range_chk
    check (amount > 0 and amount <= 100000000);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table billing_transactions add constraint billing_transactions_amount_range_chk
    check (amount >= 0 and amount <= 100000000);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table leads add constraint leads_status_chk
    check (status in ('new','in_progress','won','lost'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table bookings add constraint bookings_status_chk
    check (status in ('pending','confirmed','completed','cancelled'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table invoices add constraint invoices_status_chk
    check (status in ('draft','sent','paid','overdue','cancelled'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table orders add constraint orders_status_chk
    check (status in ('pending','paid','cancelled','refunded'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table payments add constraint payments_status_chk
    check (status in ('pending','paid','refunded','failed'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table team_invitations add constraint team_invitation_role_chk
    check (role in ('admin','member','viewer'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table users add constraint users_role_chk
    check (role in ('owner','admin','member','viewer'));
exception when duplicate_object then null; end $$;
