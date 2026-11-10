# Workflows

ExceptionPilot treats investigation, approval, execution, and audit as separate stages.

## Investigation

1. Load the exception and related PO, invoice, GRN, and vendor records.
2. Run deterministic matching and variance checks.
3. Calculate explainable risk factors.
4. Retrieve applicable policy evidence.
5. Produce a structured investigation report.

The investigation locks the exception and related financial source rows, then reads evidence and records the report in a repeatable-read transaction. Concurrent source changes cannot silently mix different versions of evidence into one report. Investigation is read-only with respect to financial state; re-running it does not regress approval or escalation state.

## Approval

Approval requests are unique while pending.

Before execution, the backend checks:

- current session
- role authority
- approval threshold
- separation of duties
- compliance requirements
- current exception/approval state

The decision is then executed transactionally. Approval requirement calculation and actor authority checks use the same centralized policy module, including a separate compliance authority.

## Approval outcomes

### Approve hold

The approved path can:

- place the invoice on hold;
- resolve the relevant exception;
- create a procurement task;
- create an unsent vendor communication draft;
- append an audit event.

Approval authorizes a **hold workflow**, not payment.

### Reject

A rejection requires a rationale and leaves a traceable decision record.

## Simulation

Simulation previews a sensitive workflow without mutating financial state.

## Tasks

Tasks use validated state transitions, lock the task row, and apply a conditional old-status update inside the transaction. Competing transitions cannot silently overwrite each other. Tasks are linked to the originating workflow where applicable.

## Monitoring

Monitoring can be triggered manually or by an authenticated scheduler.

Idempotency keys prevent duplicate SLA events and duplicate exception detections.

It is not a durable always-on background queue.

## Feedback

Resolution feedback is stored after the exception is resolved.

Feedback does not silently modify production rules or train an AI model.

## Safety boundary

The system deliberately avoids autonomous payment release, external email sending, and model-controlled financial mutations.
