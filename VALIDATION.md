# Validation

This file distinguishes historical records from checks performed against the current source revision. A validation result applies only to the exact commit and environment recorded beside it.

## Historical validation

The following results were recorded in an earlier review, but the original commit SHA and execution date were not captured. They are retained as historical context only and must not be treated as validation of the current branch.

| Area | Historical result | Qualification |
|---|---|---|
| Route type generation | PASS (reported) | Original source commit/date unavailable |
| TypeScript | PASS (reported) | Original source commit/date unavailable |
| Production build | PASS (reported) | Original source commit/date unavailable |
| Managed startup and core routes | PASS (reported) | Original source commit/date unavailable |
| Runtime dependency audit | PASS (reported) | Earlier audit reported zero runtime advisories |
| Full dependency audit | REVIEW (reported) | Earlier review noted development-tool advisories |
| Docker runtime | NOT RUN | Docker CLI unavailable in that validation environment |
| Cloud deployment | NOT RUN | No cloud deployment was claimed |
| Automated regression suite | NOT RUN | This was before the security-policy tests were added |
| Retrieval evaluation | NOT RUN | No labeled benchmark was available |

Historical seeded workspace snapshot: 24 open exceptions, 2 critical exceptions by deterministic score, ₹18,40,000 open exposure, 7 pending approvals, 2 cases in the two-hour warning window, 15 breached deadlines, 12 resolved historical exceptions, 6.5-hour average seeded resolution time, and bounded counts of 36 exceptions, 39 invoices, and 8 vendors. These figures are not current production measurements.

## Current remediation validation

| Commit | Date | Check | Result |
|---|---|---|---|
| `a495257aa32b6e07f4b25f668385720dbcbc3d50` | 2026-11-10 18:44:58–18:45:xx UTC | `npm ci --no-audit --no-fund`; `npm audit --audit-level=high`; `npm test`; `npx next typegen`; `npm run lint`; `npm run typecheck`; `npm run build` | PASS — GitHub Actions [run 42878321701](https://github.com/aayush-as69/exceptionpilot/actions/runs/42878321701); 5/5 tests passed. Audit gate exited 0; report contained 12 moderate development-tool advisories. |

The security-policy regression tests cover explicit demo configuration, production environment validation, canonical-origin matching, finance/compliance authority separation, and configurable approval thresholds. CI checks ran on GitHub Actions with Node.js 22 and npm 10.9.9. The dependency audit gate passed at the configured high-severity threshold, but its output contained 12 moderate advisories in development-tool dependency trees; review these before dependency updates. No forced breaking dependency downgrade was applied.

## What these checks do not prove

A green CI workflow does not establish:
- PostgreSQL concurrency correctness under production load;
- multi-tenant isolation or record ownership enforcement;
- distributed rate limiting or trusted reverse-proxy behavior in a live deployment;
- MFA/SSO, durable session cleanup, malware scanning, or object-storage security;
- keyboard accessibility or mobile-browser behavior;
- Docker runtime, database restore, cloud deployment, or continuous monitoring;
- retrieval recall, precision, citation correctness, grounding, or semantic RAG quality.

## Archive verification

`scripts/package.py` uses an explicit source allowlist, excludes secrets and generated/dependency directories, verifies ZIP member CRCs, and rejects environment files. Regenerate the archive after source or documentation changes.

## Validation principle

Only report checks that actually ran. For every new validation, record the exact commit SHA, UTC timestamp, command, environment, and result. Do not carry historical passes forward to a new revision.
