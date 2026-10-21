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
