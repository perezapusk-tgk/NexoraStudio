-- Nexora production auth/team/billing schema
-- Safe to run repeatedly on existing databases.

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
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists idx_billing_transactions_studio_created
  on billing_transactions(studio_id, created_at desc);
create unique index if not exists idx_billing_transactions_provider_external
  on billing_transactions(provider, external_id)
  where external_id is not null;

-- Existing installations may have users created before password_hash was added.
-- Do not invent passwords; such accounts must use registration/reset flow.
