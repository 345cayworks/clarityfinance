# Clarity Finance Access Model

## Canonical model (role vs status vs computed state)

Clarity uses **three separate concepts** for authorization:

1. **Stored role** (`users.role`) — long-lived permission identity.
2. **Approval/account status** (`users.approval_status`, `users.account_status`) — lifecycle gating.
3. **Computed access state** — runtime state derived from auth + statuses.

These must not be conflated.

---

## 1) Stored roles (database values)

Canonical stored role values are:
- `user`
- `premium_user`
- `advisor`
- `admin`
- `superadmin`

Legacy compatibility:
- Stored roles are constrained by the live `UserRole` enum: `user`, `premium_user`, `advisor`, `admin`, `superadmin`.
- `pending_user` and `active_user` are **not** stored role values.

---

## 2) Status fields (database values)

`users.approval_status`:
- `pending`
- `approved`
- `rejected`

`users.account_status`:
- `active`
- `inactive`
- `deactivated`

These fields determine whether an authenticated user can access full workspace capabilities.

---

## 3) Computed access states (runtime only)

### `visitor`
- Not authenticated.
- Allowed: public/auth routes.
- Denied: all `/app/**` routes.

### `pending_user`
Derived when authenticated and either:
- `approval_status != approved`, or
- `account_status != active`.

Allowed routes:
- `/app/pending-approval`
- `/app/onboarding`
- `/app/profile`

Denied routes:
- dashboard, scenarios, tools, reports, loan readiness, advisor dashboard, admin routes.

### `active_user`
Derived when authenticated and both:
- `approval_status = approved`, and
- `account_status = active`.

Allowed routes:
- dashboard, onboarding, profile, scenarios, tools, rent-room, reports, action plan, settings.

Role-specific overlays for active users:
- `premium_user` unlocks premium loan routes.
- `advisor` unlocks advisor-assigned workflows.
- `admin`/`superadmin` unlock admin operations.

---

## Enforcement helpers

`netlify/functions/_access.ts` is the centralized helper for API enforcement:
- `requireAuth`
- `requireActiveUser`
- `requirePremiumUser` (checks `premium_user`, `admin`, `superadmin`)
- `requireAdvisor`
- `requireAdmin`
- `requireAssignedAdvisorOrAdmin`


> Note: `premium` was evaluated as a possible legacy alias, but it is not valid in the live `UserRole` enum.
