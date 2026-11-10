# Testing

## Local checks

Install the exact dependency graph and run the repository checks:

```bash
npm ci
npm test
npx next typegen
npm run lint
npm run typecheck
npm run build
```

The security-policy regression suite uses Node's built-in test runner and covers:
- demo-mode fail-closed behavior;
- required production environment variables;
- canonical HTTPS origin validation;
- separation between finance and compliance approval authority;
- configurable approval thresholds.

## Continuous integration

The GitHub Actions workflow runs:

1. `npm ci` with the committed lockfile;
2. a separate `npm audit --audit-level=high` dependency audit;
3. the automated regression tests;
4. Next.js route type generation;
5. ESLint;
6. TypeScript checking;
7. a production build.

Dependency audit output must be reviewed before changing dependency versions or enabling automated dependency updates. Do not use `npm audit fix` as an unattended remediation step.

## Coverage still required

The current automated suite is not a full security or product test suite. Add and independently verify:
- authenticated and unauthenticated API route tests;
- role-by-role API payload projection tests for every workspace dataset;
- task and approval concurrency integration tests against PostgreSQL;
- before/after audit transaction tests;
- browser tests for keyboard access, dialogs, responsive breakpoints, and real login flows;
- production deployment smoke tests through the configured reverse proxy;
- upload malware-scanning tests;
- database backup and restore tests;
- retrieval relevance and citation-quality benchmarks.

## Evidence

Only record checks that actually ran. Include the commit SHA, date, command, environment, and result for each validation. A green build does not prove production security, database restore capability, browser accessibility, cloud deployment, or retrieval quality.
