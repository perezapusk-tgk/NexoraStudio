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
