# Data Model (Current + Canonical Access Mapping)

## Users table access fields

### `users.role` (stored role)
Canonical stored values:
- `user`
- `premium_user`
- `advisor`
- `admin`
- `superadmin`


### `users.approval_status` (lifecycle approval)
Values:
- `pending`
- `approved`
- `rejected`

### `users.account_status` (lifecycle activation)
Values:
- `active`
- `inactive`
- `deactivated`

---

## Computed access states (derived, not stored)

These states are computed at runtime from auth + status fields and must **not** be persisted as role values:

- `visitor`: unauthenticated.
- `pending_user`: authenticated but not fully approved/active.
- `active_user`: authenticated + approved + active.

Derived behavior:
- `pending_user` can complete onboarding/profile, but cannot use core dashboard/scenario/report/loan/admin/advisor-dashboard routes.
- `active_user` can access core workspace routes.
- premium/advisor/admin/superadmin capabilities are overlays on top of active status.

---

## Domain model summary

### 1) User / access
- Identity from Netlify Identity JWT.
- Access checks enforced through `netlify/functions/_access.ts` helpers.
- Admin lifecycle functions mutate `users.role`, `users.approval_status`, and `users.account_status`.

### 2) Financial profile
- Captured in onboarding and consumed by dashboard/report/tools via `profile-save` and `profile-get`.

### 3) Scenarios
- General planning assumptions/outputs saved via `scenario-save`.

### 4) Room rental scenario
- Persisted through `rent-room-save`; retrieved via `rent-room-get`.

### 5) Advisor requests and assignment
- Created by users, reviewed by assigned advisors, triaged/assigned by admins.

### 6) Loan readiness
- Premium-gated routes include `/app/loan-readiness`, `/app/loan-application`, and `/app/prequalification/proven-bank`.
- `loan_readiness_applications` stores readiness score/band, ratios, monthly summary, document checklist, missing docs, and saved application JSON.
- Advisor escalation is connected through `advisor-request-save` with source context `loan_readiness`.

## Canonical next-phase model recommendation
1. **User**
2. **UserAccessStatus**
3. **FinancialProfile**
4. **Scenario**
5. **RoomRentalScenario**
6. **LoanReadinessApplication**
7. **AdvisorRequest**
8. **AdvisorAssignment**
9. **ActionPlan**
10. **Report**


> Note: `premium` was considered as a legacy alias, but it is not valid in the live `UserRole` enum.


## Advisor request artifact fields
Expected advisor request fields (nullable):
- `source_context`: one of `advisor-request`, `loan_readiness`, `prequalification`, `report`, `action_plan`.
- `prequalification_share_url`: optional protected/internal URL to an artifact; if absent the UI shows a missing-artifact guidance state.
- `recommendation_json`: structured object used for advisor summaries (readiness score/band, urgency/package, key notes, monthly surplus, DTI, housing ratio, total monthly pressure, missing documents).
- Optional linking fields if present in schema: `loan_readiness_application_id`, `loan_readiness_report_id`, `artifact_type`.
