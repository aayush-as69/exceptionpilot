# Database

ExceptionPilot stores operational, financial, workflow, policy, and audit data in PostgreSQL through Drizzle ORM.

## Core schema

The schema is defined in `src/db/schema.ts`.

It covers:

- users and sessions
- vendors
- purchase orders
- goods receipts
- invoices
- exceptions
- approvals
- tasks
- notifications
- documents
- policy chunks
- policies
- audit events
- agent runs
- communications
- feedback
- settings
- playbooks

## Financial precision

Financial values use **integer paise**, not floating-point numbers.

Tolerance comparisons cross-multiply before comparison so that percentage checks remain deterministic.

## Data integrity

Foreign keys and indexes support common lookups across vendor, owner, status, risk, deadline, document, and audit history.

Session tokens are stored as SHA-256 digests rather than raw session values.

## Documents and policies

Policy sources are versioned.

A policy points to the active source while previous sources can be archived. Uploaded documents begin as drafts and require explicit activation.

## Audit data

Audit records include before/after values for configuration and workflow changes.

An append-only PostgreSQL trigger prevents ordinary application-level deletion or mutation of audit rows.

This is an audit integrity control, not a guarantee against a database superuser.

## Migrations

```bash
npx tsx scripts/migrate.ts
```

Use this on a fresh database.

The preview database was originally push-bootstrapped and had the audit guard applied separately. Do not blindly replay the initial migration over an already-pushed, unbaselined database.

## Deliberate scope

The demo uses typed JSONB line items instead of a fully normalized item/version/risk-history model.

A production implementation would normally add durable temporal history, stronger tenancy boundaries, backup/restore procedures, and migration rehearsal.
