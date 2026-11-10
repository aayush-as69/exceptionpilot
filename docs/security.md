# Security

ExceptionPilot has application-level security controls, but the current repository remains a single-tenant prototype and is **not approved for production financial data**.

## Authentication and sessions

- Passwords use salted scrypt hashing.
- Sessions use random tokens; PostgreSQL stores SHA-256 token digests rather than raw tokens.
- Cookies are HTTP-only and SameSite=Lax, with an eight-hour lifetime.
- Production cookies are always marked Secure.
- Active-user status is checked when resolving a session.
- Every protected route requires a valid authenticated session. There is no anonymous seeded-user fallback.
- Demo role selection is an explicit login action and is enabled only when `APP_ENV=development` and `DEMO_MODE=true`.

## Runtime configuration and demo mode

The application rejects missing or contradictory `APP_ENV` and `DEMO_MODE` values at startup. Production additionally requires:

```text
APP_ENV=production
DEMO_MODE=false
SEED_ON_START=false
DATABASE_URL=<production database URL>
APP_ORIGIN=https://your-canonical-host.example
```

Production startup rejects demo mode, automatic demo seeding, missing database configuration, and a missing or non-canonical HTTPS application origin. Never expose seeded demo credentials or role switching on an internet-facing deployment.

## Authorization and data projection

- Backend permissions are checked on protected API operations and workspace routes.
- Approval requirements and role authority are resolved through one policy module.
- Compliance approval remains separate from the finance hierarchy.
- Workspace responses limit approval records, tasks, communications, user emails, roles, settings, playbooks, and feedback according to the current actor's permissions.
- Navigation visibility follows the same view permission matrix, but is not treated as a security boundary.
- The current record model is single-tenant. Ownership and organization-level record scoping must be implemented before supporting multiple organizations.

## Request protection

- Zod validation for structured actions.
- Bounded JSON parsing and parameterized Drizzle queries.
- Upload extension, MIME, UTF-8, and size validation.
- Mutating browser requests are checked against the canonical `APP_ORIGIN` in production. Client-supplied forwarded-host values are not used for origin decisions.
- A production reverse proxy must overwrite forwarded headers and keep internal services private.
- The process-local rate limiter is best-effort only. It is not shared across instances and can reset on process restart. Enforce distributed rate limits at a trusted gateway or shared store before production use.
- Security headers and CSP are present, but the current policy still permits inline scripts and styles.

## Audit and workflow state

Audit events are append-only at the PostgreSQL trigger layer. Settings updates now capture the previous value before mutation and write the change and audit event in the same transaction. Task transitions lock the task row and verify its old state before applying the update.

Approving a hold resolves the immediate exception workflow while leaving the invoice in `ON_HOLD`. An exception marked `RESOLVED` must not be interpreted as the invoice being cleared for payment; procurement follow-up and any later clearance remain separate business steps.

## Retrieval and AI capability

The current retrieval implementation combines PostgreSQL full-text rank with lexical token overlap over a bounded candidate set. Its `matchStrength` is a lexical overlap score, not semantic confidence or a probability of correctness.

OpenAI/Gemini inference, embedding generation, a vector database, semantic retrieval, model-based tool execution, and calibrated confidence are not implemented.

## Remaining production controls

Before production use, add and independently verify:

- SSO/MFA and session renewal, rotation, revocation, and cleanup.
- Distributed rate limiting and trusted-proxy deployment configuration.
- Multi-tenant isolation and record-scope authorization.
- Malware scanning and controlled document/object storage.
- Nonce-based CSP and removal of inline allowances where feasible.
- Durable distributed job scheduling and query observability.
- PostgreSQL backup/restore drills and production monitoring.
- Browser-based keyboard, accessibility, responsive, and deployment smoke tests.
- Formal retrieval-quality evaluation and dependency remediation.
- Independent penetration testing.

High risk is never treated as proof of fraud.
