# Testing status

The current repository does not include a comprehensive automated test suite.

That is an explicit project status, not a hidden omission.

## Checks currently recorded

See [VALIDATION.md](../VALIDATION.md) for the exact validation record.

The documented checks cover:

- Next.js route type generation
- TypeScript compilation
- production build
- managed startup
- health/readiness
- core workspace routes
- OpenAPI endpoint
- dependency audit

## What is not covered

There is currently no comprehensive automated coverage for financial edge cases, workflow transitions, authorization matrices, API integration behavior, upload security, accessibility, RAG retrieval quality, agent behavior, concurrency, Docker runtime, or cloud deployment.

## Recommended next step

Add tests in layers:

1. **Unit** — financial math, risk rules, state transitions.
2. **Integration** — database constraints, workflow transactions, permissions.
3. **API** — authentication, validation, status codes, idempotency.
4. **Security** — authorization matrix, upload abuse, session behavior.
5. **Retrieval** — labeled evidence recall and citation correctness.
6. **End-to-end** — investigation → approval → hold → audit.
7. **Deployment** — container startup, readiness, migration, restore.

Until those exist, describe the project as a validated functional demo rather than a fully tested production system.
