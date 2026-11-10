# Security

ExceptionPilot applies security controls at the browser, API, workflow, and database layers.

## Authentication

- Passwords use salted scrypt hashing.
- Sessions use random tokens.
- PostgreSQL stores SHA-256 session digests rather than raw tokens.
- Cookies are HTTP-only and SameSite=Lax.
- Sessions expire after eight hours.
- Production cookies require HTTPS.
- Active-user status is checked during authorization.

## Authorization

Authorization is enforced on the backend.

Controls include:

- granular permissions;
- finance role hierarchy;
- approval thresholds;
- separation of duties;
- compliance-sensitive approval requirements;
- server-side re-checks for mutations.

The administrator role does not automatically inherit financial approval authority.

## Input and request protection

- Zod validation for structured actions.
- Bounded JSON parsing.
- Parameterized database queries through Drizzle.
- Upload extension, MIME, UTF-8, and size validation.
- Origin checks for browser mutations.
- Restrictive security headers and CSP.
- Masking of sensitive vendor identifiers.

## Audit protection

Audit events are append-only at the PostgreSQL trigger layer.

The application cannot simply rewrite the audit history through normal mutation paths.

## Demo mode

Demo mode intentionally provides development conveniences such as anonymous fallback access and role switching.

It must not be used with real financial data.

Before non-demo deployment:

```text
APP_ENV=production
DEMO_MODE=false
SEED_ON_START=false
```

## Remaining production controls

Before production use, add and independently verify:

- SSO/MFA
- distributed throttling
- tenant isolation
- secret rotation
- malware scanning
- object storage controls
- proxy-level upload limits
- nonce-based CSP
- dependency remediation
- penetration testing
- backup/restore drills
- formal session revocation review
- security monitoring

High risk is never treated as proof of fraud.
