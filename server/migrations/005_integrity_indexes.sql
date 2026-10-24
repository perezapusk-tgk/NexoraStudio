-- Concurrency-safe integrity guards for authentication.
-- Application-level checks remain responsible for invitation lifecycle rules.

create unique index if not exists users_email_ci_unique
  on users (lower(email));

create unique index if not exists sessions_token_hash_unique
  on sessions (token_hash);
