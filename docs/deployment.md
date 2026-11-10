# Deployment

## Local development

```bash
npm ci
npx tsx scripts/migrate.ts
npx tsx scripts/seed.ts
npm run dev
```

## Docker

The repository includes a multi-stage Dockerfile and a development-oriented Compose setup.

```bash
docker compose up --build
```

Compose starts PostgreSQL, runs the migration service, then starts the standalone Next.js server.

Docker execution is only claimed when recorded in [VALIDATION.md](../VALIDATION.md).

## Production baseline

Use:

```text
APP_ENV=production
DEMO_MODE=false
SEED_ON_START=false
```

Also configure strong database credentials, HTTPS/TLS, a trusted reverse proxy, controlled administrator provisioning, backups, restore testing, dependency monitoring, and application monitoring.

Provision an administrator with:

```bash
npx tsx scripts/provision-admin.ts
```

## Scheduled monitoring

If continuous monitoring is required:

`POST /api/cron`

Use a strong `CRON_SECRET` and send it as a bearer token.

## Reverse proxy

The production proxy should terminate TLS, overwrite forwarded headers, enforce request-body limits, apply rate limiting, provide access logging, and avoid exposing internal services directly.

## Database operations

Run backups and rehearse restoration before real financial data is introduced.

The application does not ship cloud credentials and does not claim a cloud deployment.
