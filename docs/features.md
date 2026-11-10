# Feature checklist

This page separates **working demo behavior** from capabilities that are intentionally outside the current scope.

## Implemented

- [x] Persistent core records and seeded scenarios
- [x] Database-derived dashboard metrics
- [x] Queue search, filters, sorting, pagination, assignment
- [x] Invoice / PO / GRN / vendor viewers
- [x] Deterministic matching and variance checks
- [x] Duplicate indicators and explainable risk factors
- [x] Version-aware policy evidence
- [x] Mock investigation
- [x] Permission-aware copilot
- [x] Human approval and hold workflow
- [x] Rejection rationale and follow-up tasks
- [x] Read-only simulation
- [x] Append-only audit controls
- [x] Evidence JSON/PDF export
- [x] TXT/CSV/JSON upload validation
- [x] Policy version activation and change preview
- [x] SLA indicators and idempotent monitoring
- [x] Analytics and risk heatmap
- [x] Root-cause grouping and preventive suggestions
- [x] Reusable playbooks
- [x] Session authentication and backend RBAC
- [x] Demo role switching
- [x] Light/dark themes
- [x] Command search and notifications
- [x] CSV/JSON/PDF exports
- [x] Migrations, seed/provision scripts
- [x] OpenAPI documentation
- [x] Docker configuration
- [x] Project documentation

## Not implemented

- [ ] External OpenAI/Gemini adapters
- [ ] Embedding semantic retrieval / pgvector
- [ ] PDF/DOCX/XLSX/image extraction
- [ ] Live ERP integration
- [ ] Payment execution
- [ ] External email delivery
- [ ] Durable distributed workers
- [ ] Full normalized item/version/risk/SLA history
- [ ] Custom exception-type detection models
- [ ] Calibrated AI confidence
- [ ] Formal automated test suite
- [ ] Formal RAG evaluation benchmark
- [ ] SSO/MFA
- [ ] Production tenant isolation
- [ ] Production security certification
- [ ] Verified cloud deployment

## Product principle

A feature is marked implemented only when the repository contains a working path for it. A future capability is not presented as completed merely because the architecture could support it.
