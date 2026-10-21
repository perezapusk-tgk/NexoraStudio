-- Nexora Studio operations hardening
-- Apply after server/schema.sql on existing PostgreSQL databases.

alter table if exists bookings
  add column if not exists ends_at timestamptz;

alter table if exists bookings
  add column if not exists client_id uuid references clients(id) on delete set null;

alter table if exists bookings
  add column if not exists service_name text;

alter table if exists bookings
  add column if not exists status text not null default 'pending';

create index if not exists idx_bookings_status_start
  on bookings(status, starts_at);

create index if not exists idx_bookings_client
  on bookings(client_id);

alter table if exists leads
  add column if not exists status text not null default 'new';

create index if not exists idx_leads_status_created
  on leads(status, created_at desc);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  booking_id uuid references bookings(id) on delete set null,
  amount numeric(12,2) not null,
  currency text not null default 'EUR',
  status text not null default 'pending',
  description text,
  created_at timestamptz not null default now()
);
create index if not exists idx_payments_project_created on payments(project_id, created_at desc);
create index if not exists idx_payments_status on payments(status);
