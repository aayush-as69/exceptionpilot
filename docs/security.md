# Security

ExceptionPilot applies controls at the browser, API, workflow, and database layers. The current repository is a single-tenant prototype and is **not approved for production financial data**.

## Authentication

- Passwords use salted scrypt hashing.
- Sessions use random tokens; PostgreSQL stores SHA-256 digests, not raw tokens.
- Cookies are HTTP-only and SameSite=Lax, with an eight-hour lifetime.
- Production cookies require HTTPS.
- Active-user status is checked when resolving a session.
- Every protected operation requires a valid authenticated session. Demo role selection is an explicit login flow and never supplies an anonymous identity.

## Demo mode and deployment

Demo mode is available only when both `APP_ENV=development` and `DEMO_MODE=true` are explicitly configured. Missing or invalid environment values fail runtime validation. Production requires `APP_ENV=production`, `DEMO_MODE=false`, and `SEED_ON_START=false`.

A seeded demo account is not a production identity. Never expose demo credentials or demo role switching on an internet-facing deployment.

## Authorization

Authorization is enforced by the backend through granular permissions, role checks, approval thresholds, separation of duties, and compliance-sensitive approval requirements. UI navigation is not an authorization boundary.

The current authorization model is single-tenant. Record ownership and organization-level scoping must be designed before supporting multiple organizations.

## Input and request protection

- Zod validation for structured actions.
- Bounded JSON parsing and parameterized Drizzle queries.
- Upload extension, MIME, UTF-8, and size validation.
- Origin validation for browser mutations.
- Security headers and CSP.
- Masking of sensitive vendor identifiers.

**Proxy requirement:** requests must pass through a controlled reverse proxy that overwrites forwarded headers. Configure a canonical `APP_ORIGIN` and do not trust client-supplied forwarded-host values. Apply request throttling at a trusted distributed gateway. The in-process limiter is development-only and is not a production rate limiter.

## Audit protection

Audit events are append-only at the PostgreSQL trigger layer. Settings changes must preserve the before-state and after-state in the same transaction.

## Retrieval and AI capability

The current retrieval implementation combines PostgreSQL full-text rank with lexical token overlap. Its match score is not semantic confidence. OpenAI/Gemini inference, embedding generation, vector search, semantic retrieval, model-based tool execution, and calibrated confidence are not implemented.

## Remaining production controls

Before production use, add and independently verify:

- SSO/MFA and a complete session renewal/revocation lifecycle.
- Distributed rate limiting and canonical-origin enforcement behind a trusted proxy.
- Tenant isolation and record-scope authorization.
- Malware scanning and controlled document/object storage.
- Nonce-based CSP and removal of inline allowances where feasible.
- Database backup/restore drills and production monitoring.
- Durable distributed job scheduling.
- Browser-based accessibility, responsive, and production smoke tests.
- Formal retrieval-quality evaluation and dependency remediation.
- Independent penetration testing.

High risk is never treated as proof of fraud.
