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
- `requirePremiumOrStaff` (checks `premium_user`, `advisor`, `admin`, `superadmin`)
- `requireAdvisor`
- `requireAdmin`
- `requireAssignedAdvisorOrAdmin`


> Note: `premium` was evaluated as a possible legacy alias, but it is not valid in the live `UserRole` enum.

---

## Premium tool access

Premium planning tools stay visible on `/app/tools` for all authenticated active users, but standard `user` accounts see locked cards and upgrade prompts. Direct route access also renders a locked premium screen instead of the working calculator. Server-side functions for premium tools must use `requirePremiumOrStaff`.

| Feature | user | premium_user | advisor | admin | Notes |
| --- | --- | --- | --- | --- | --- |
| Dividend Reinvestment Calculator | Visible but locked | Full access including save/load | Full access including save/load | Full access including save/load | Manual-input planning calculator. Saved projections are scoped to the current user. |
| Investment Analyzer | Visible but locked | Full access | Full access | Full access | Netlify analysis function requires Premium, Advisor, or Admin access. Historical market data is cached in the database and reused for backtesting. |
| Analyze / Advanced Analysis | Visible but locked if present | Full access | Full access | Full access | No separate Advanced Analysis route currently exists. Apply the same premium-tool pattern if added. |
| Tools page | Can view locked cards | Can open premium cards | Can open premium cards | Can open premium cards | Locked cards show a Premium badge and upgrade CTA. |

Dividend Reinvestment Calculator server functions use `requirePremiumOrStaff`, so standard `user` accounts cannot save, list, load, update, or delete saved projections even if they call the endpoints directly. Admin and advisor roles save their own projections only; cross-user saved projection browsing is not part of this feature.

Dividend yield lookup is also a premium-tool function. `dividend-yield-lookup` uses `requirePremiumOrStaff` and returns cached database results when fresh before attempting any server-side provider refresh. Admin-only `dividend-yield-refresh` and `dividend-yield-cache-list` use `requireAdmin`. Market data is cached in the database and must not be stored in the repository; manual dividend yield entry remains available for every authorized calculator user.

Investment Analyzer remains premium/staff only through `requirePremiumOrStaff`. Alpha Vantage calls are server-side only and populate `market_price_history` plus `market_data_sync_status`; React components never receive API keys and historical market data is not committed to the repository. Admin-only `market-data-refresh-ticker` can force refresh one ticker for cache maintenance.

## Data sharing consent

Advisor and bank sharing are separate from role, approval, activation, and premium access. A user must explicitly consent before Clarity Finance creates an advisor/bank sharing request that includes financial profile, readiness, report, or supporting information. Consent is captured by `advisor-request-save` and does not change the user's role or account lifecycle status.
