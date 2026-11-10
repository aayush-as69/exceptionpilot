# Deployment

## Local development

1. Copy `.env.example` to `.env`.
2. Keep the explicit local values `APP_ENV=development`, `DEMO_MODE=true`, and `SEED_ON_START=true`.
3. Start the database and application:

```bash
docker compose up --build
```

For a non-Docker workflow, install dependencies with `npm ci`, run migrations with `npx tsx scripts/migrate.ts`, seed with `npx tsx scripts/seed.ts`, then run `npm run dev`.

## Production baseline

Do not use the development Compose defaults for an internet-facing service. Configure all of the following explicitly:

```text
APP_ENV=production
DEMO_MODE=false
SEED_ON_START=false
POSTGRES_PASSWORD=<strong unique secret>
CRON_SECRET=<at least 24 characters of random secret>
APP_ORIGIN=https://your-canonical-host.example
```

The application rejects incomplete or contradictory application-mode configuration. Provision an administrator through the controlled provisioning script:

```bash
npx tsx scripts/provision-admin.ts
```

Terminate TLS at a trusted reverse proxy. The proxy must overwrite forwarded headers, enforce request-body limits, apply distributed rate limiting, log access, and keep PostgreSQL private. Do not rely on the process-local development limiter for production protection.

## Docker Compose

Compose is intended for local development. It binds the web port to loopback and requires an explicit database password and explicit application mode. Review and replace all secrets before use.

## Scheduled monitoring

The `POST /api/cron` endpoint runs monitoring when invoked with a strong `CRON_SECRET` bearer token. The repository does not include a durable scheduler or distributed worker; configure an external scheduler and understand that each invocation processes a bounded batch.

## Database operations

Back up PostgreSQL and rehearse restoration before introducing real financial data. Production deployment, database restore, monitoring, and proxy behavior require environment-specific verification and are not claimed by this repository.
