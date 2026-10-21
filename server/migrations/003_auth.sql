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
