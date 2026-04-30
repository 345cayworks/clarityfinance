# Clarity Finance Access Model

## Roles

### 1) visitor
- **Allowed routes:** Public marketing routes (`/`, `/about`, `/features`, `/pricing`, `/contact`, `/success`) and auth routes (`/login`, `/signup`, `/forgot-password`, `/reset-password`).
- **Denied routes:** All `/app/**` workspace routes.
- **Allowed functions:** None directly; must authenticate first.
- **Monetization/access:** Not onboarded; no product access.
- **Upgrade/approval path:** Sign up -> becomes `pending_user`.

### 2) pending_user
- **Allowed routes:** Auth routes + `/app/pending-approval` + limited onboarding/profile save flow if enabled.
- **Denied routes:** Dashboard, scenarios, reports, advisor/admin dashboards until approved.
- **Allowed functions:** `account-status`, `activity-ping`, `me`, `profile-get`, `profile-save` (as configured).
- **Monetization/access:** Registered but gated from full product value.
- **Upgrade/approval path:** Admin approval -> `active_user` (or rejection/deactivation).

### 3) active_user
- **Allowed routes:** Core `/app` routes (dashboard, onboarding, profile, scenarios, tools, report/action-plan, settings).
- **Denied routes:** Premium-only features, advisor dashboard routes, admin routes.
- **Allowed functions:** Core profile/scenario/report functions + own advisor request creation/status.
- **Monetization/access:** Approved base-tier access.
- **Upgrade/approval path:** Payment/plan upgrade -> `premium_user`.

### 4) premium_user
- **Allowed routes:** All `active_user` routes plus premium-gated modules (loan readiness and advanced workflows as enabled).
- **Denied routes:** Admin and advisor operational routes unless dual role assigned.
- **Allowed functions:** Core + premium scenario/readiness endpoints.
- **Monetization/access:** Paid tier.
- **Upgrade/approval path:** Admin or billing upgrade from `active_user`.

### 5) advisor
- **Allowed routes:** Advisor workflows (`/app/advisor`, `/app/advisor/dashboard`, `/app/advisor/status`) and assigned-case tools.
- **Denied routes:** Admin governance routes unless additional admin role.
- **Allowed functions:** `advisor-requests-assigned`, `advisor-request-update`, advisor request detail/list functions as scoped.
- **Monetization/access:** Staff/partner operational role.
- **Upgrade/approval path:** Admin role assignment.

### 6) admin
- **Allowed routes:** Admin routes (`/app/admin`, `/app/admin/accounts`, `/app/admin/notifications`) plus broad oversight.
- **Denied routes:** Superadmin-only governance (if separately implemented).
- **Allowed functions:** Admin user lifecycle + advisor assignment/request triage endpoints.
- **Monetization/access:** Internal platform operator.
- **Upgrade/approval path:** Elevated by superadmin/owner.

### 7) superadmin
- **Allowed routes:** All routes.
- **Denied routes:** None by default.
- **Allowed functions:** All functions including role mutation and access governance.
- **Monetization/access:** Full tenancy control.
- **Upgrade/approval path:** Manual owner-level provisioning only.

## Enforcement Notes
- Route guards should evaluate both **authentication** and **account status/role**.
- API functions should mirror route access with explicit JWT role/status checks.
- Premium modules should fail closed when plan status is missing.
