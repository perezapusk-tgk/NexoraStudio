-- Payment provider fields are schema-managed here instead of being mutated at API startup.
alter table if exists orders
  add column if not exists payment_provider text;

alter table if exists orders
  add column if not exists payment_external_id text;

-- Nexora's current payment flows are RUB-only. Keep new operation records aligned
-- with the application contract while preserving existing rows unchanged.
alter table if exists payments
  alter column currency set default 'RUB';

alter table if exists invoices
  alter column currency set default 'RUB';

alter table if exists orders
  alter column currency set default 'RUB';
