alter table studios add column if not exists billing_currency text not null default 'RUB';
alter table studios add column if not exists subscription_status text not null default 'active';
alter table studios add column if not exists subscription_started_at timestamptz;
alter table studios add column if not exists subscription_renews_at timestamptz;
alter table studios add column if not exists billing_provider text;

create table if not exists billing_transactions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  plan text not null,
  amount numeric(12,2) not null,
  currency text not null,
  status text not null default 'pending',
  provider text,
  provider_payment_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists idx_billing_transactions_studio_created on billing_transactions(studio_id, created_at desc);