-- Remove legacy Stripe billing fields. Nexora uses YooKassa for RUB payments.
alter table studios drop column if exists stripe_customer_id;
alter table studios drop column if exists stripe_subscription_id;
alter table studios drop column if exists stripe_connect_account_id;
alter table studios drop column if exists stripe_connect_status;
alter table billing_transactions drop column if exists stripe_customer_id;
alter table billing_transactions drop column if exists stripe_subscription_id;
alter table orders drop column if exists stripe_checkout_session_id;
alter table orders drop column if exists stripe_payment_intent_id;
