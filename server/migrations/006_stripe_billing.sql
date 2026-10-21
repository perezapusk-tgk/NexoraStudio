alter table studios add column if not exists stripe_customer_id text;
alter table studios add column if not exists stripe_subscription_id text;
create index if not exists studios_stripe_customer_idx on studios(stripe_customer_id);
create index if not exists studios_stripe_subscription_idx on studios(stripe_subscription_id);
alter table billing_transactions add column if not exists stripe_customer_id text;
alter table billing_transactions add column if not exists stripe_subscription_id text;
alter table studios add column if not exists stripe_connect_account_id text;
alter table studios add column if not exists stripe_connect_status text not null default 'not_connected';
create index if not exists studios_stripe_connect_idx on studios(stripe_connect_account_id);


alter table orders add column if not exists stripe_checkout_session_id text;
alter table orders add column if not exists stripe_payment_intent_id text;
alter table orders add column if not exists paid_at timestamptz;
create unique index if not exists idx_orders_stripe_checkout_session on orders(stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create index if not exists idx_orders_stripe_payment_intent on orders(stripe_payment_intent_id) where stripe_payment_intent_id is not null;
