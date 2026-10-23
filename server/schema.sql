create extension if not exists pgcrypto;

create table if not exists studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_name text not null,
  plan text not null default 'starter',
  project_limit integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  name text not null,
  slug text not null,
  project_type text not null default 'website',
  status text not null default 'draft',
  domain text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studio_id, slug)
);

create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  slug text not null,
  content jsonb not null default '{"blocks":[]}'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, slug)
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  name text not null,
  email text,
  phone text,
  message text,
  status text not null default 'new',
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'pending',
  service_name text,
  created_at timestamptz not null default now()
);

create table if not exists catalog_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12,2),
  currency text not null default 'RUB',
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists analytics_events (
  id bigserial primary key,
  project_id uuid references projects(id) on delete cascade,
  event_type text not null,
  path text,
  value numeric(12,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_studio on projects(studio_id);
create index if not exists idx_leads_project_created on leads(project_id, created_at desc);
create index if not exists idx_bookings_project_start on bookings(project_id, starts_at);
create index if not exists idx_events_project_created on analytics_events(project_id, created_at desc);

insert into studios (id, name, owner_name, plan, project_limit)
values ('00000000-0000-0000-0000-000000000001', 'Nexora Studio', 'Алексей', 'pro', 50)
on conflict (id) do nothing;


-- Auth, team and billing tables required by the production API.
alter table studios add column if not exists billing_currency text not null default 'RUB';
alter table studios add column if not exists subscription_status text not null default 'active';
alter table studios add column if not exists billing_provider text;
alter table studios add column if not exists subscription_started_at timestamptz;
alter table studios add column if not exists subscription_renews_at timestamptz;
alter table users add column if not exists password_hash text;

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_sessions_token_hash on sessions(token_hash);
create index if not exists idx_sessions_user on sessions(user_id);

create table if not exists team_invitations (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  invited_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_team_invitations_studio on team_invitations(studio_id);
create index if not exists idx_team_invitations_token on team_invitations(token_hash);

create table if not exists billing_transactions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  plan text not null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'RUB',
  status text not null default 'pending',
  provider text,
  external_id text,
  provider_payment_id text,
  checkout_url text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists idx_billing_transactions_studio_created
  on billing_transactions(studio_id, created_at desc);
create index if not exists idx_billing_transactions_provider_payment
  on billing_transactions(provider, provider_payment_id);
