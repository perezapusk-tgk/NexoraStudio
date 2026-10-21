alter table studios add column if not exists stripe_customer_id text;
alter table studios add column if not exists stripe_subscription_id text;
create index if not exists studios_stripe_customer_idx on studios(stripe_customer_id);
create index if not exists studios_stripe_subscription_idx on studios(stripe_subscription_id);
alter table billing_transactions add column if not exists stripe_customer_id text;
alter table billing_transactions add column if not exists stripe_subscription_id text;
alter table studios add column if not exists stripe_connect_account_id text;
alter table studios add column if not exists stripe_connect_status text not null default 'not_connected';
create index if not exists studios_stripe_connect_idx on studios(stripe_connect_account_id);
