# API

The API is a single-tenant, authenticated workspace interface. Application handlers are dispatched through `src/lib/api.ts`; the generated OpenAPI document should be checked against that dispatcher when routes change.

## Health and readiness

| Method and path | Authentication | Behavior |
|---|---|---|
| `GET /health` | Public | Executes `SELECT 1` against PostgreSQL and returns database connectivity. This is not a lightweight process-only liveness check. |
| `GET /api/health` | Public | Also checks PostgreSQL connectivity. |
| `GET /ready` | Public | Checks PostgreSQL and may initialize the explicitly enabled development demo seed. |
| `GET /api/ready` | Public | Returns API/database readiness and current provider metadata. |
| `GET /api/openapi` | Public | Returns the generated API description. |

## Authentication

| Method and path | Required access | Input and result |
|---|---|---|
| `POST /api/auth/login` | Public | Email/password, or `demoUserId` only in explicitly enabled development demo mode. Creates an eight-hour HTTP-only session. |
| `POST /api/auth/logout` | Session if present | Deletes the current session and cookie. |
| `GET /api/auth/me` | Valid session | Returns the current actor and whether development demo mode is enabled. |

No protected route receives a fallback actor. Missing, invalid, inactive, or expired sessions are rejected.

## Workspace reads

All collection reads require a valid session and the listed permission.

| Method and path | Permission |
|---|---|
| `GET /api/workspace` | `exception.read` |
| `GET /api/exceptions`, `GET /api/exceptions/:id` | `exception.read` |
| `GET /api/invoices` | `invoice.read` |
| `GET /api/vendors` | `vendor.read` |
| `GET /api/purchase-orders`, `GET /api/goods-receipts` | `invoice.read` |
| `GET /api/approvals` | `approval.create` or `approval.execute`; requesters see their own records, approvers see the approval queue |
| `GET /api/tasks` | `task.manage` |
| `GET /api/policies` | `policy.read` |
| `GET /api/documents` | `document.read` |
| `GET /api/analytics` | `analytics.read` |
| `GET /api/audit` | `audit.read` |
| `GET /api/notifications` | `notification.read`; scoped to the current user |
| `GET /api/users` | `user.manage` |
| `GET /api/agents` | `invoice.read` |
| `GET /api/tools` | `invoice.read` |

Collection responses use bounded pagination and search over a recent workspace snapshot. Workspace projections omit or restrict selected datasets and fields according to role. The exception detail endpoint currently follows the single-tenant permission model and does not provide organization-level ownership scoping.

## Mutations and sensitive operations

| Method and path | Permission / authentication | Behavior |
|---|---|---|
| `POST /api/exceptions/:id/investigate` | `exception.investigate` | Runs a deterministic, read-only investigation. |
| `GET /api/exceptions/:id/evidence` | `audit.export` | Exports the source evidence packet. |
| `POST /api/approvals/:id/execute` | `approval.execute` | Approves or rejects a pending approval with separation-of-duties and role checks. |
| `POST /api/actions` | Action-specific permission | Supports approval request, communication draft, escalation, simulation, assignment, feedback, explicit notification read, and monitoring actions. |
| `POST /api/tasks`, `PATCH /api/tasks/:id` | `task.manage` | Creates a task or performs a locked, conditional status transition. |
| `POST /api/documents`, `PATCH /api/documents/:id` | `document.manage` | Uploads a validated draft or activates a draft document. |
| `PATCH /api/policies/:id` | `policy.manage` | Previews or activates a new policy version. |
| `PATCH /api/settings` | `system.configure` | Updates validated configuration with transactional before/after audit state. |
| `GET /api/users`, `PATCH /api/users/:id` | `user.manage` | Reads users or changes account active status; deactivation revokes sessions. |
| `POST /api/playbooks` | `system.configure` | Creates reusable workflow guidance. |
| `POST /api/copilot` | `exception.read` | Runs the current deterministic copilot. |
| `POST /api/cron` | Bearer `CRON_SECRET` | Runs one bounded monitoring invocation; no durable worker is bundled. |

For `read-notifications`, send either a non-empty `ids` array or the explicit `all: true` flag. Omitting both is rejected; the server always scopes the update to the authenticated user.

Browser mutations require an Origin that matches the configured canonical origin in production. The scheduled cron endpoint uses its bearer secret and is exempt from the browser Origin requirement.

## Errors and security boundary

Expected API errors include 400, 401, 403, 404, 409, 413, 429, and 500. Responses include request IDs where supported. A failed mutation is never reported as successful.

This API is not a public multi-tenant contract. Organization-level isolation, record ownership, distributed throttling, and independent deployment verification remain production prerequisites.
