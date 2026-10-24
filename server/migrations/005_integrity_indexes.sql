-- Concurrency-safe integrity guards for authentication and team invitations.
-- These indexes complement application-level duplicate checks so concurrent requests
-- cannot create duplicate identities or multiple active invites for the same workspace/email.

create unique index if not exists users_email_ci_unique
  on users (lower(email));

create unique index if not exists team_invites_active_email_ci_unique
  on team_invitations (studio_id, lower(email))
  where accepted_at is null and expires_at > now();

create unique index if not exists sessions_token_hash_unique
  on sessions (token_hash);
