# Nexora Studio — Release checklist

## Current release gate

The repository must pass:
- Nexora CI
- API Hardening
- release smoke test
- production database migrations
- health check with PostgreSQL

## Before public launch

1. Configure a real HTTPS APP_URL.
2. Configure a production DATABASE_URL.
3. Run the service with npm start; migrations are applied automatically.
4. Verify /api/health returns HTTP 200 and reports PostgreSQL.
5. Create a real studio account and verify login/logout.
6. Create a project from each supported project type.
7. Publish a project and verify the public page.
8. Verify lead submission, CRM conversion and client isolation.
9. Verify booking conflict protection with two simultaneous requests.
10. Verify catalog, checkout and pending order creation.
11. Connect a custom domain only after CNAME verification.
12. Configure Telegram Mini App only after the project is published.
13. Verify team invitations, role restrictions and workspace isolation.
14. Review production logs and database migrations.

## Payments

YooKassa is the final launch step. Until credentials and webhook configuration are verified in production, external checkout remains intentionally disabled. Do not enable production payment flows with placeholder credentials.

## Security

- Keep DATABASE_URL, Telegram and YooKassa secrets only in server environment variables.
- Never expose bot/payment secrets to the browser.
- Keep production HTTPS enabled.
- Do not run production on memory storage.
