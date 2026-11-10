# Validation record — Option B

## Checks actually performed

| Check | Result |
|---|---|
| `npx next typegen` | PASS — route types generated |
| `npm exec tsc -- --noEmit --pretty false` | PASS — no TypeScript errors |
| `npm run build` | PASS — Next.js 16.4.6 production build |
| Managed `build_and_start` | PASS — production server started and `/api/health` passed |
| `GET /` | HTTP 200 |
| `GET /ready` | HTTP 200 |
| `GET /workspace/exceptions` | HTTP 200 |
| `GET /workspace/settings` | HTTP 200 |
| `GET /api/openapi` | HTTP 200 |
| `npm audit --omit=dev` | 0 runtime advisories |
| Full dependency audit | 15 development-tool advisories remained (13 moderate, 2 high); not represented as a clean full audit |
| Docker build/runtime | NOT RUN — Docker CLI unavailable in this sandbox |
| Cloud deployment | NOT RUN — no claim made |
| Automated test suite | NOT ADDED OR RUN, per final request |
| RAG evaluation | NOT RUN — no metrics fabricated |

The required type-generation, TypeScript, and production-build commands were run from the project root with pipefail and logged to /tmp/next-typegen.log, /tmp/tsc.log, and /tmp/build.log. Those temporary logs are not included in the source archive.

## Live PostgreSQL snapshot at validation

- 24 open exceptions; 2 critical by the actual deterministic scores.
- ₹18,40,000 open financial exposure (184000000 integer paise).
- 7 pending approvals; 2 cases within the two-hour SLA warning window; 15 breached deadlines.
- 12 resolved historical exceptions; 6.5-hour average seeded resolution time.
- 36 exceptions, 39 invoices, and 8 vendors in the bounded snapshot.

These are measured demo values, not a claim that every illustrative number in the original specification was reproduced. No metric was hardcoded to make the dashboard appear populated.

## Archive verification

`python3 scripts/package.py` uses an explicit source allowlist, excludes .env and generated/dependency directories, verifies every ZIP member's CRC, and rejects secret environment files. Regenerate the archive after changing source or documentation. The downloadable artifact is public/exceptionpilot-option-b.zip.

## Scope reminder

Passing compilation and startup checks is not a security certification or a substitute for the comprehensive original test requirements. See docs/testing.md, docs/evaluation.md, and docs/features.md for explicit omissions and known limitations.