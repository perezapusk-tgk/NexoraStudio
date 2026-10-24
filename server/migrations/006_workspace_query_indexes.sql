-- Workspace-scoped query indexes for the production API.
-- These indexes do not change behavior; they keep ownership checks and dashboard
-- queries efficient as each studio grows.

create index if not exists idx_clients_studio_created
  on clients(studio_id, created_at desc);

create index if not exists idx_projects_studio_updated
  on projects(studio_id, updated_at desc);

create index if not exists idx_team_invitations_studio_active
  on team_invitations(studio_id, expires_at)
  where accepted_at is null;

create index if not exists idx_billing_transactions_studio_status_created
  on billing_transactions(studio_id, status, created_at desc);
