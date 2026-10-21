-- Nexora Studio authentication and workspace isolation
-- Apply after 002_operations.sql.

alter table if exists users
  add column if not exists password_hash text;

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_token_hash on sessions(token_hash);
create index if not exists idx_sessions_expires on sessions(expires_at);

-- Email uniqueness is kept global for the first production auth iteration.


-- Team invitations
create table if not exists team_invitations (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin','member','viewer')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  invited_by uuid references users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_team_invitations_studio on team_invitations(studio_id);
create index if not exists idx_team_invitations_token on team_invitations(token_hash);
create index if not exists idx_team_invitations_expiry on team_invitations(expires_at);
