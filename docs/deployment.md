# Deployment

## Local development

1. Copy `.env.example` to `.env`.
2. Keep the explicit local values:

```text
APP_ENV=development
DEMO_MODE=true
SEED_ON_START=true
APP_ORIGIN=http://localhost:3000
```

3. Start the local database and application:

```bash
docker compose up --build
```

For a non-Docker workflow, install dependencies with `npm ci`, run migrations with `npx tsx scripts/migrate.ts`, seed with `npx tsx scripts/seed.ts`, then run `npm run dev`.

## Production configuration

Do not use the development defaults for an internet-facing service. Set all production values explicitly:

```text
APP_ENV=production
DEMO_MODE=false
SEED_ON_START=false
DATABASE_URL=<production database URL>
POSTGRES_PASSWORD=<strong unique secret>
CRON_SECRET=<at least 24 characters of random secret>
APP_ORIGIN=https://your-canonical-host.example
```

Startup validation rejects missing application mode, demo mode enabled in production, automatic startup seeding, missing database configuration, and missing or invalid canonical HTTPS origin.

Provision an administrator using the controlled script:

```bash
npx tsx scripts/provision-admin.ts
```

Do not reuse seeded demo credentials. Keep PostgreSQL private and rotate every deployment secret through the target platform's secret manager.

## Reverse proxy and rate limits

Terminate TLS at a trusted reverse proxy. The proxy must overwrite forwarded headers, enforce request-body limits, apply distributed rate limiting, log access, and avoid exposing internal services directly. Configure `APP_ORIGIN` to the exact public origin, without a path or trailing slash. The application does not trust `x-forwarded-host` for origin validation.

The in-process rate limiter is only a best-effort secondary control. It is not distributed and is not sufficient as the production rate-limit boundary.

## Docker Compose

Compose is intended for local development. It binds the web port to loopback, requires an explicit database password and explicit application mode, and defaults the canonical origin to localhost for local use. Review and replace all secrets before use.

## Scheduled monitoring

The `POST /api/cron` endpoint runs monitoring when invoked with a strong `CRON_SECRET` bearer token. The repository does not include a durable scheduler or distributed worker; configure an external scheduler and understand that each invocation processes a bounded batch.

## Database operations

Back up PostgreSQL and rehearse restoration before introducing real financial data. Production deployment, database restore, monitoring, and proxy behavior require environment-specific verification and are not claimed by this repository.
