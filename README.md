# ExceptionPilot 2.0 — Option B

**A self-contained, downloadable enterprise exception-management demo.**

This workspace was empty when the ZIP request arrived; there was no pre-existing Option B implementation to archive. This archive therefore contains the working demo built in this workspace, not a claim that the entire original enterprise specification has been implemented. The final request was to package Option B without additional tests. No automated test suite was added or run.

## Overview

ExceptionPilot connects invoice exceptions to structured financial records, explainable risk factors, versioned policy evidence, and explicit human approval. It is an investigator and workflow application—not a chatbot and not an autonomous payment system.

The default screen is a polished, responsive overview with live PostgreSQL metrics, a priority queue, risk distribution, activity, and vendor watchlist. The central seeded case is **INV-1042**: PO **₹1,10,000**, invoice **₹1,24,000**, difference **₹14,000 / 12.73%**, policy tolerance **5%**.

## Download

Use **Settings → Download Option B ZIP**, or open `/exceptionpilot-option-b.zip` on the running app. The archive includes source, SQL migrations, seed and provisioning scripts, documentation, Docker configuration, lockfile, and `.env.example`. It excludes `.env`, credentials beyond explicitly documented development-only demo passwords, dependencies, build output, and local logs.

## Features implemented

- Overview, exception queue, personal queue, invoices, purchase orders, goods receipts, vendor profiles, approvals, tasks, policies, documents, analytics, copilot, audit, administration, settings.
- PostgreSQL persistence through Drizzle; foreign keys, indexes, transactions, row locks, unique idempotency keys.
- Exact integer-minor-unit financial totals and three-way matching checks.
- Exact and near-duplicate indicators, transparent additive risk scoring, historical case lookup.
- Deterministic investigation reports with concise decision factors and traceable source excerpts.
- Version-aware policy retrieval using PostgreSQL keyword ranking, lexical overlap, and metadata filtering.
- Human approval requests, role hierarchy, separation of duties, single-use decisions, controlled invoice holds, follow-up tasks, and communication drafts.
- Simulations that do not execute a financial action.
- Append-only audit events enforced by a PostgreSQL trigger; JSON evidence packets and client-generated PDF reports.
- Validated TXT/CSV/JSON uploads, draft activation, archived source versions, policy-change impact previews.
- SLA indicators and idempotent monitoring/escalation, runnable manually or by an authenticated scheduler.
- Session authentication, scrypt password hashing, granular backend RBAC, login/API throttling, origin checks, secure headers, sensitive-field masking.
- Real workspace analytics, risk × impact heatmap, root-cause grouping, preventive recommendations, resolution feedback, reusable playbooks.
- Light/dark themes, responsive record layouts, Ctrl/Cmd+K search, notifications, CSV/JSON/PDF exports.

## Architecture and stack choice

The provided runtime is a **Next.js App Router + TypeScript + PostgreSQL/Drizzle** environment. Option B keeps that deployable stack instead of introducing a separate Vite/FastAPI service. React server components load permission-filtered snapshots; client components handle interaction; App Router route handlers expose REST APIs; domain, investigation, retrieval, workflow, and audit services are separated under `src/lib`.

- `src/app`: pages, route handlers, health/readiness.
- `src/components`: responsive UI, charts, queue, investigation drawer, settings.
- `src/lib/domain.ts`: exact financial logic, risk rules, state transitions, permission registry.
- `src/lib/actions.ts`: controlled workflows and monitoring.
- `src/lib/investigation.ts`: structured decision records and evidence packets.
- `src/lib/retrieval.ts`: active-version policy retrieval.
- `src/db`: PostgreSQL connection and schema.
- `drizzle`: migrations, including append-only audit enforcement.
- `scripts`: migration, seed, production admin provisioning.

See [architecture](docs/architecture.md), [database](docs/database.md), and [workflows](docs/workflows.md).

## Screenshots

No screenshot is bundled or fabricated. The running root page is the overview; open `/?exception=EXC-1042` for the seeded investigation. Capture screenshots locally if needed for your deployment documentation.

## AI architecture and limitations

**No external LLM is connected.** The only implemented provider is `mock / deterministic-rules-v1`. It reads real records, performs deterministic checks, retrieves real stored evidence, and returns structured findings. It does not pretend to be Gemini or OpenAI. The agent is read-only; all financial state changes require explicit human requests and backend authorization.

OpenAI/Gemini adapters, embeddings, autonomous agent orchestration, external email, and ERP integrations are not implemented. Agent run latency is measured; external token count and estimated external-model cost are zero because no model is called. No hidden chain-of-thought is stored. See [AI agent](docs/ai-agent.md).

## RAG architecture

Policy chunks retain source document, version, section, page, category, and text. Retrieval filters active/effective/unexpired sources, combines PostgreSQL full-text ranking with lexical overlap, and returns the actual excerpt. Metadata-selected investigation evidence is explicitly labeled. This is **hybrid keyword/lexical retrieval, not embedding-based semantic RAG**. No citation or model-confidence percentage is fabricated. See [RAG](docs/rag.md).

## Security and RBAC

Roles: AP Clerk, AP Manager, Finance Manager, Finance Director, Procurement, Compliance, Auditor, Administrator. Administrator does **not** inherit financial approval authority. Higher finance roles can satisfy lower finance approval thresholds; compliance-sensitive cases require Compliance. Requesters cannot approve their own requests.

Sessions use random tokens with only SHA-256 digests stored in PostgreSQL, HTTP-only/SameSite cookies, and an eight-hour expiry. Production-mode cookies require HTTPS. Passwords use salted scrypt. Mutations check origin and permissions again on the server. See [security](docs/security.md) and [threat model](docs/threat-model.md).

## Approval workflow and demo flow

1. Open the dashboard and select **INV-1042**.
2. Review exact PO/invoice/GRN checks and risk factors.
3. Select **Run investigation**. A pending approval remains pending; investigation is read-only.
4. Review **Evidence & policy** and optionally **Simulate**.
5. The seeded **APR-1042** request is already awaiting review. New cases use **Request approval**.
6. Check the evidence-review confirmation and select **Approve hold**. Default demo user Alex Morgan is a Finance Director; you can switch to Sarah Miller or David Park in Settings.
7. The backend records the decision, places the invoice on hold, resolves the exception, creates a procurement task, drafts a vendor message, and appends an audit event.
8. Review the audit timeline, communication draft, and evidence export. Give resolution feedback.

No payment is released and no email is sent. Repeating a decided approval returns a conflict.

## Database

The schema includes users, roles, sessions, vendors, purchase orders, goods receipts, invoices, exceptions, approvals, tasks, notifications, documents, policy chunks, policies, audit events, agent runs, communications, feedback, settings, and playbooks. Line items are typed JSONB on their parent financial records. Amounts are integer paise. This demo does not implement separate item/version/risk-history tables from the full enterprise specification.

For a **fresh database**, run `npx tsx scripts/migrate.ts`. The current preview schema was initially applied with `drizzle-kit push`; do not run the initial migration over an already-pushed, unbaselined database. For local development only, `npx drizzle-kit push` is available.

## API

Open `/workspace/api-docs` for the endpoint browser or `/api/openapi` for OpenAPI 3.0 JSON. REST collections cover the core modules. Collection endpoints use a bounded recent-record snapshot, not an unbounded production query API. See [API](docs/api.md).

## Local setup

Requirements: Node.js 22+, npm, PostgreSQL 17+ (or a compatible supported PostgreSQL instance).

1. Extract the ZIP and enter the `exceptionpilot-option-b` directory.
2. Run `npm ci`.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` for your local database.
4. On a fresh database, run `npx tsx scripts/migrate.ts`.
5. Run `npx tsx scripts/seed.ts`.
6. Run `npm run dev` and open http://localhost:3000.

For a production-mode local build: run `npx next typegen`, `npm exec tsc -- --noEmit --pretty false`, `npm run build`, then `npm run start`. The platform preview uses its managed build/start runner.

## Environment variables

See `.env.example`. Important settings:

- `DATABASE_URL`: server-side PostgreSQL connection.
- `DEMO_MODE=true`: enables explicit development-only demo access and role switching.
- `APP_ENV=production` and `DEMO_MODE=false`: disable anonymous demo fallback and role switching.
- `SEED_ON_START`: seed only when explicitly enabled; demo mode also seeds its development workspace.
- `CRON_SECRET`: optional random secret of at least 24 characters for `POST /api/cron`.
- `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD`: used only by the explicit admin-provisioning script.

No LLM API key is required or read in Option B. Never commit `.env` or real credentials.

## Demo credentials — DEVELOPMENT ONLY

All seeded accounts use **`Demo!Pilot2026`**. Emails use `@exceptionpilot.demo`.

| User | Email prefix | Role |
|---|---|---|
| Jamie Chen | clerk | AP Clerk |
| Sarah Miller | manager | AP Manager |
| David Park | finance | Finance Manager |
| Alex Morgan | director | Finance Director |
| Priya Sharma | procurement | Procurement |
| Olivia Wilson | compliance | Compliance |
| James Taylor | auditor | Auditor |
| Taylor Reed | admin | Administrator |

These are public demo credentials, not production secrets. Disable demo mode and seed-on-start before non-demo deployment.

## Testing and evaluation

Per the final request, **no additional tests were written or run**. Type generation, TypeScript, production build, managed startup/health, and archive checks are recorded in `VALIDATION.md`. These are build/deployment checks, not a substitute for the full requested test suite.

No RAG evaluation percentages are displayed or claimed. A formal labeled evaluation dataset and Recall@5/precision/grounding suite remain future work. See [testing](docs/testing.md) and [evaluation](docs/evaluation.md).

## Deployment

`Dockerfile` uses a multi-stage standalone Next.js build and non-root runtime. `docker-compose.yml` starts PostgreSQL, applies migrations, then starts the app. Run `docker compose up --build` for the explicitly development-only local demo. Docker execution is not claimed unless recorded in `VALIDATION.md`.

For non-demo use, set `APP_ENV=production`, `DEMO_MODE=false`, `SEED_ON_START=false`, use a strong database password, terminate TLS, and provision an administrator with `npx tsx scripts/provision-admin.ts`. The admin can configure the workspace but cannot approve financial actions. Additional finance users require a controlled provisioning process. See [deployment](docs/deployment.md).

## Troubleshooting

- **Missing DATABASE_URL:** copy the example environment file and configure your database.
- **Relation already exists during migrate:** the database was pushed without a migration baseline. Use a fresh database or baseline it deliberately; do not drop financial data.
- **Sign-in loop:** demo fallback is disabled in production. Sign in with a provisioned account over HTTPS.
- **Approval forbidden:** check role hierarchy, compliance requirement, and separation of duties.
- **No citations:** activate an effective, unexpired source document. The app intentionally refuses to invent evidence.
- **No automatic background timer:** use the Administration monitor button or schedule the authenticated cron endpoint.
- **ZIP unavailable:** regenerate it using `python3 scripts/package.py` after building.

## Known limitations / future roadmap

This is a functional, scoped demo—not the complete production-grade platform in the original request. Not implemented: external LLM providers, semantic embeddings/pgvector, PDF/DOCX/XLSX/image ingestion, live ERP/payment/email integrations, a durable distributed job queue, full historical financial versioning, calibrated model confidence, a formal evaluation/test suite, distributed rate limiting, enterprise SSO/MFA, custom-type detection logic, and comprehensive vendor anomaly detection. Some analytics use a bounded 250-record snapshot; headline metrics use SQL aggregates. Historical items are JSONB. Uploaded binary documents are rejected rather than silently mishandled.

Before production: add the missing provider/integration adapters, durable jobs, object storage and malware scanning, full authorization/tenant isolation review, migrations and backup/restore drills, observability, accessibility audit, security review, and the complete automated test/evaluation program. See [feature checklist](docs/features.md).
