# Evaluation status

## Semantic RAG calibration

Semantic retrieval and grounded generation are implemented behind explicit provider configuration. The application computes a versioned retrieval-grounding confidence signal from similarity, result margin, evidence count, lexical agreement, and citation coverage. The current profile is a baseline calibration profile, not a claim of production-grade probability calibration.\n\nA production evaluation must replace the baseline profile with parameters fitted on a labeled dataset and report Recall@5, MRR, citation correctness, grounded-answer accuracy, refusal accuracy, latency, and cost for each provider.

ExceptionPilot does not currently include a labeled AI/RAG evaluation dataset or a reproducible benchmark run.

Therefore the following metrics are **unmeasured**:

- Recall@5
- precision
- citation correctness
- grounding
- policy accuracy
- hallucination rate
- calibrated model confidence

Unmeasured is intentionally different from zero.

## Recommended evaluation plan

Create a labeled set containing:

1. normal policy questions;
2. expired policy versions;
3. contradictory policy sources;
4. missing-evidence cases;
5. irrelevant documents;
6. prompt-injection attempts;
7. duplicate/near-duplicate cases;
8. different exception categories.

Then compare retrieval strategies using reproducible queries and expected evidence labels.

## Review criteria

A future evaluation should separately score evidence retrieval, citation correctness, policy interpretation, decision consistency, authorization behavior, refusal behavior, latency, and cost when an external model is introduced.

Resolution feedback is stored for future analysis. It does not automatically train or change production logic.
