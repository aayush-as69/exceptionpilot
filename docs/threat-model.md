# Threat model

## Assets

The most important assets are:

- financial records;
- vendor identifiers;
- policy sources;
- approval decisions;
- sessions;
- audit history.

## Trust boundaries

```text
Browser
   │
   ▼
Next.js / API
   │
   ├── Uploaded text
   ├── Retrieval
   ├── Workflow services
   └── Authentication / authorization
           │
           ▼
      PostgreSQL
```

A future external AI provider would create an additional boundary and must be introduced explicitly.

## Main mitigations

| Threat | Current mitigation |
|---|---|
| Unauthorized financial action | Backend RBAC + workflow authority checks |
| Self-approval | Separation of duties |
| Replay of approval | Single-use transactional decisions |
| SQL injection | Parameterized Drizzle queries |
| XSS | React escaping |
| Cross-origin mutation | Origin checks |
| Oversized JSON | Bounded parsing |
| Malformed uploads | Extension/MIME/UTF-8/size validation |
| Sensitive identifiers in UI | Masking |
| Audit mutation | Append-only database trigger |
| Prompt/tool escalation | Copilot permission boundary + no financial tool authority |
| Session theft exposure | Expiry + digest-only storage |

## Residual risks

The current demo still has meaningful risks:

- binary uploads are rejected rather than malware-scanned;
- distributed API abuse is not covered by process-local throttling;
- demo credentials must never be used for real data;
- database superusers can bypass application-level audit protections;
- reverse-proxy header handling must be configured safely;
- tenant isolation is not implemented;
- dependency advisories remain in development tooling;
- anomaly detection is deliberately limited.

High risk is a workflow signal, not proof of fraud.

## Production security work

Before real deployment, complete SSO/MFA, secret rotation, tenant isolation, malware scanning, object storage controls, proxy limits, dependency remediation, monitoring, backup/restore drills, penetration testing, and an independent security review.
