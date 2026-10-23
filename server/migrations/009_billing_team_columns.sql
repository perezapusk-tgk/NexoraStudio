-- Complete columns used by current Nexora billing/team API.
alter table billing_transactions add column if not exists provider_payment_id text;
alter table billing_transactions add column if not exists checkout_url text;
alter table team_invitations add column if not exists invited_by uuid references users(id) on delete set null;
create index if not exists idx_billing_transactions_provider_payment on billing_transactions(provider, provider_payment_id);
