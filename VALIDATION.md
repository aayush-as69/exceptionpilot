# Validation

> A factual record of checks performed against the current ExceptionPilot build.

## Validation summary

| Area | Result | Meaning |
|---|---|---|
| Route type generation | ✅ PASS | Next.js route types generated |
| TypeScript | ✅ PASS | No TypeScript errors |
| Production build | ✅ PASS | Next.js 16.4.6 build completed |
| Managed startup | ✅ PASS | Production server started and health endpoint responded |
| Core routes | ✅ PASS | Workspace and health routes returned HTTP 200 |
| OpenAPI | ✅ PASS | /api/openapi returned HTTP 200 |
| Runtime dependency audit | ✅ PASS | 0 runtime advisories |
| Full dependency audit | ⚠️ REVIEW | 15 development-tool advisories remained |
| Docker runtime | ⏭️ NOT RUN | Docker CLI was unavailable in the validation environment |
| Cloud deployment | ⏭️ NOT RUN | No cloud deployment was claimed |
| Automated test suite | ⏭️ NOT RUN | No automated suite was added |
| RAG evaluation | ⏭️ NOT RUN | No labeled benchmark was available |

## Runtime snapshot

The validation environment contained:

- 24 open exceptions
- 2 critical exceptions by deterministic score
- ₹18,40,000 open financial exposure
- 7 pending approvals
- 2 cases within the two-hour SLA warning window
- 15 breached deadlines
- 12 resolved historical exceptions
- 6.5-hour average seeded resolution time
- 36 exceptions, 39 invoices, and 8 vendors in the bounded snapshot

These are measured demo values from the seeded workspace. They are not hardcoded product claims.

## What validation proves

The recorded checks establish that the application can:

1. generate its Next.js route types;
2. compile TypeScript;
3. produce a production build;
4. start successfully in the managed validation environment;
5. serve the documented health/readiness and core workspace routes;
6. expose the OpenAPI document;
7. pass the recorded runtime dependency audit.

They do **not** establish production security, financial correctness under all edge cases, accessibility compliance, performance at scale, or the quality of an external AI/RAG system.

## Archive verification

`scripts/package.py` uses an explicit source allowlist, excludes secrets and generated/dependency directories, verifies ZIP member CRCs, and rejects environment files.

Regenerate the archive after source or documentation changes.

## Validation principle

ExceptionPilot reports what was actually checked. It does not convert missing evidence into a passing result.
