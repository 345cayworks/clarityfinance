# Route Map

Legend route types: `PUBLIC`, `USER_CORE`, `SCENARIO`, `LOAN_READINESS`, `ADVISOR`, `ADMIN`, `UTILITY`.

| Route | File path | Purpose | Type | Role access | API/functions called | Key components | Recommendation |
|---|---|---|---|---|---|---|---|
| `/` | `app/(public)/page.tsx` | Public landing page | PUBLIC | visitor+ | none | marketing layout | keep |
| `/about` | `app/(public)/about/page.tsx` | About Clarity Finance | PUBLIC | visitor+ | none | public pages | keep |
| `/features` | `app/(public)/features/page.tsx` | Feature overview | PUBLIC | visitor+ | none | public pages | improve messaging to canon |
| `/pricing` | `app/(public)/pricing/page.tsx` | Pricing/plan messaging | PUBLIC | visitor+ | none | public pages | keep |
| `/contact` | `app/(public)/contact/page.tsx` | Contact entry | PUBLIC | visitor+ | none | public pages | keep |
| `/success` | `app/(public)/success/page.tsx` | Post-action success page | PUBLIC | visitor+ | none | public pages | keep |
| `/login` | `app/(auth)/login/page.tsx` | Authentication | PUBLIC | visitor+ | identity auth | auth components | keep |
| `/signup` | `app/(auth)/signup/page.tsx` | Registration | PUBLIC | visitor+ | identity auth | auth components | keep |
| `/forgot-password` | `app/(auth)/forgot-password/page.tsx` | Password reset request | PUBLIC | visitor+ | identity auth | auth components | keep |
| `/reset-password` | `app/(auth)/reset-password/page.tsx` | Password reset completion | PUBLIC | visitor+ | identity auth | auth components | keep |
| `/app` | `app/(workspace)/app/page.tsx` | Workspace entry/redirect shell | UTILITY | authenticated | account-status/me via guards | workspace layout | keep |
| `/app/pending-approval` | `app/(workspace)/app/pending-approval/page.tsx` | Waiting room for gated approval | UTILITY | pending_user | account-status | workspace guard | keep |
| `/app/onboarding` | `app/(workspace)/app/onboarding/page.tsx` | Capture financial profile baseline | USER_CORE | pending_user+ | `profile-get`, `profile-save` | onboarding form | keep |
| `/app/profile` | `app/(workspace)/app/profile/page.tsx` | Profile summary/edit | USER_CORE | pending_user+ | likely profile endpoints | profile UI | improve consistency |
| `/app/dashboard` | `app/(workspace)/app/dashboard/page.tsx` | Core money position dashboard | USER_CORE | active_user+ | `profile-get` | charts/widgets | keep |
| `/app/scenarios` | `app/(workspace)/app/scenarios/page.tsx` | Scenario planning controls | SCENARIO | active_user+ | `scenario-save` | scenario cards | keep |
| `/app/tools` | `app/(workspace)/app/tools/page.tsx` | Tool launcher | SCENARIO | active_user+ | none | links to calculators | keep |
| `/app/tools/mortgage` | `app/(workspace)/app/tools/mortgage/page.tsx` | Mortgage scenario tool | SCENARIO | active_user+ | `profile-get` (via shared component) | `tool-calculators` | keep |
| `/app/tools/refinance` | `app/(workspace)/app/tools/refinance/page.tsx` | Refinance scenario tool | SCENARIO | active_user+ | `profile-get` | `tool-calculators` | keep |
| `/app/tools/debt-plan` | `app/(workspace)/app/tools/debt-plan/page.tsx` | Debt reduction scenario | SCENARIO | active_user+ | `profile-get` | `tool-calculators` | keep |
| `/app/tools/rent-room` | `app/(workspace)/app/tools/rent-room/page.tsx` | Legacy alias for room-rental scenario tool | SCENARIO | active_user+ | `rent-room-save` | `RentRoomTool` | hide from nav (alias) |
| `/app/tools/rent-a-room` | `app/(workspace)/app/tools/rent-a-room/page.tsx` | Rent a Room Scenario tool | SCENARIO | active_user+ | `rent-room-save` | `RentRoomTool` | keep as canonical label |
| `/app/report` | `app/(workspace)/app/report/page.tsx` | Generate user reports incl. room-rental report | USER_CORE | active_user+ | `profile-get`, `rent-room-get` | reporting UI | rename labels for scenario clarity |
| `/app/reports` | `app/(workspace)/app/reports/page.tsx` | Report creation endpoint trigger | USER_CORE | active_user+ | `report-create` | report starter page | merge/improve IA |
| `/app/action-plan` | `app/(workspace)/app/action-plan/page.tsx` | Action plan generation | USER_CORE | active_user+ | `profile-get`, `action-plan-generate` | plan UI | keep |
| `/app/loan-readiness` | `app/(workspace)/app/loan-readiness/page.tsx` | Premium loan readiness hub linking application + prequalification | LOAN_READINESS | premium_user/admin/superadmin | `profile-get`, `advisor-request-save` | readiness hub UI | keep |
| `/app/loan-application` | `app/(workspace)/app/loan-application/page.tsx` | Loan readiness intake (early) | LOAN_READINESS | premium_user (target) | `profile-get` | application form | future phase harden gating |
| `/app/prequalification/proven-bank` | `app/(workspace)/app/prequalification/proven-bank/page.tsx` | Bank-specific prequalification flow | LOAN_READINESS | premium_user (target) | `profile-get` | long-form flow | hide from nav until finalized |
| `/app/advisor` | `app/(workspace)/app/advisor/page.tsx` | Advisor module entry | ADVISOR | active_user+/advisor | varies | advisor module | keep |
| `/app/advisor/request` | `app/(workspace)/app/advisor/request/page.tsx` | Submit advisor request | ADVISOR | active_user+ | `advisor-request-save` | request form | keep |
| `/app/advisor/status` | `app/(workspace)/app/advisor/status/page.tsx` | User-visible status of own requests | ADVISOR | active_user+ | `advisor-requests-my` | status list | keep |
| `/app/advisor/dashboard` | `app/(workspace)/app/advisor/dashboard/page.tsx` | Advisor assigned cases dashboard | ADVISOR | advisor+ | `advisor-requests-assigned`, `advisor-request-update` | advisor tables | protect strictly |
| `/app/admin` | `app/(workspace)/app/admin/page.tsx` | Admin home | ADMIN | admin+ | `me` | admin nav | keep |
| `/app/admin/accounts` | `app/(workspace)/app/admin/accounts/page.tsx` | User approval/roles/assignment | ADMIN | admin+ | `admin-users-list`, `admin-advisors-list`, admin-user* | admin account table | keep |
| `/app/admin/notifications` | `app/(workspace)/app/admin/notifications/page.tsx` | Admin notifications workflow | ADMIN | admin+ | (verify linkage) | notifications UI | improve / wire fully |
| `/app/settings` | `app/(workspace)/app/settings/page.tsx` | User settings | USER_CORE | active_user+ | none/limited | settings UI | keep |


## Fail-closed gating behavior
- Unauthenticated users are redirected to `/login`.
- Authenticated users with unresolved or non-active status are redirected to `/app/pending-approval` (with profile/onboarding exceptions).
- Unauthorized role access is redirected to `/app/dashboard` (or to `/app/pending-approval` for pending users).
