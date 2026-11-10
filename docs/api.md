# API

The API is designed around authenticated workspace operations rather than an unrestricted public API.

## Discovery

- `GET /api/openapi` — machine-readable OpenAPI 3.0 document
- `/workspace/api-docs` — interactive API browser
- `GET /health` — lightweight liveness
- `GET /ready` — readiness and database checks
- `GET /api/health` — application health

## Authentication

- `POST /api/auth/login` — email/password login
- `POST /api/auth/logout` — end session
- `GET /api/auth/me` — current session
- `demoUserId` is accepted only when demo mode is enabled

## Core reads

Collection endpoints cover invoices, exceptions, vendors, purchase-orders, goods-receipts, approvals, tasks, policies, documents, audit, notifications, analytics, users, and agents.

Collections support bounded pagination and search over a recent snapshot.

## Sensitive operations

| Endpoint | Purpose |
|---|---|
| `POST /api/exceptions/:id/investigate` | Run a read-only investigation |
| `GET /api/exceptions/:id/evidence` | Export investigation evidence |
| `POST /api/approvals/:id/execute` | Approve or reject a pending request |
| `POST /api/actions` | Execute a validated workflow action |
| `POST /api/tasks` | Create a task |
| `PATCH /api/tasks/:id` | Change task status |
| `POST /api/documents` | Upload a validated document |
| `PATCH /api/documents/:id` | Activate a draft document |
| `PATCH /api/policies/:id` | Preview or activate a policy version |
| `PATCH /api/settings` | Update administration settings |
| `PATCH /api/users/:id` | Update user configuration |
| `POST /api/playbooks` | Create workflow guidance |
| `POST /api/copilot` | Ask the permission-aware copilot |
| `POST /api/cron` | Run authenticated monitoring |

## Errors

Expected API errors include 400, 401, 403, 404, 409, 413, 429, and 500.

Responses include a request ID where supported.

A failed mutation is never reported as successful.

## Security boundary

The API is a demo workspace API, not a public multi-tenant contract.

Permissions are checked on the server, and browser mutations are protected by origin validation.
