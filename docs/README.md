# ExceptionPilot Documentation

Technical documentation for the finance exception investigation and approval platform.

## Documentation map

| Document | Purpose |
|---|---|
| architecture.md | Application and domain architecture |
| database.md | PostgreSQL schema, migrations and financial precision |
| workflows.md | Investigation, approval, hold and resolution flows |
| ai-agent.md | AI provider boundary and grounded investigation behavior |
| rag.md | Policy retrieval, pgvector and lexical fallback |
| evaluation.md | Retrieval grounding evaluation and confidence calibration |
| security.md | Authentication, authorization, sessions and headers |
| threat-model.md | Assets, attack surfaces, mitigations and residual risk |
| api.md | Endpoint behavior and permission boundaries |
| testing.md | Automated and manual verification |
| deployment.md | Local, Docker and production deployment |
| features.md | Implemented, partial and planned functionality |

## Architecture principle

Financial decisions are deterministic and permission-controlled. Retrieval provides evidence; AI generation does not receive permission to release payments or bypass approval controls.

## Evidence principle

Policy answers must remain tied to versioned stored evidence. Retrieval confidence is an evaluation signal, not a probability that an answer is true. Recalibrate it against a project-specific labeled set before production use.

## Source-of-truth rule

Code, migrations, tests and the validation report are authoritative. Do not document future roadmap items as implemented.