# Nexora API

Backend foundation for Nexora Studio.

## Run

`npm install`
`npm run api`

The API runs on port 4000 by default.

If `DATABASE_URL` is absent, the API intentionally uses demo data so the frontend can be developed before PostgreSQL is connected.

## Endpoints

- GET /api/health
- GET /api/studio
- GET /api/projects
- POST /api/projects
- GET /api/leads
- GET /api/bookings
- GET /api/clients
- GET /api/analytics/overview
- GET /api/templates

## PostgreSQL

Run `server/schema.sql` against the Nexora PostgreSQL database, then set `DATABASE_URL`.


## Billing

Nexora supports real checkout in two currencies:
- USD → Stripe Checkout (`STRIPE_SECRET_KEY`)
- RUB → ЮKassa (`YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`)

Set `APP_URL` or `FRONTEND_URL` to the public app URL. Without provider credentials, real checkout is intentionally unavailable; `BILLING_MODE=manual` can be used only for development/testing and does not charge money.

Each successful checkout grants the selected plan for 30 days. The app confirms the payment with the provider before activating the plan.


## Stripe

Для production задайте `STRIPE_SECRET_KEY` и `STRIPE_WEBHOOK_SECRET`. Для Connect рекомендуется отдельный `STRIPE_CONNECT_WEBHOOK_SECRET` (если используется отдельный endpoint). Комиссия платежей проектов задаётся через `STRIPE_PLATFORM_FEE_PERCENT`.

Поток: Studio → Connect onboarding → опубликованный Website/Mini App → Stripe Checkout → Connected Account; Nexora удерживает application fee. SaaS-тарифы Nexora идут отдельной Stripe Billing subscription.
