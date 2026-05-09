# Netlify Function Map

| Function | File path | Purpose | Method | Role required | Data touched | Frontend callers | Classification | Recommendation |
|---|---|---|---|---|---|---|---|---|
| `account-status` | `netlify/functions/account-status.ts` | Resolve auth/account gating state | GET | authenticated | user status/access | workspace guard | ACCESS_CONTROL | keep + protect |
| `activity-ping` | `netlify/functions/activity-ping.ts` | Update recent activity heartbeat | POST | authenticated | user session/activity | workspace guard | UTILITY | keep + document |
| `me` | `netlify/functions/me.ts` | Return current user identity/role | GET | authenticated | user identity | admin page | ACCESS_CONTROL | keep |
| `profile-get` | `netlify/functions/profile-get.ts` | Fetch financial profile aggregates, including profile email fallback from Identity | GET | approved user (pending support optional by policy) | profile tables | onboarding/dashboard/report/tools | CORE | keep |
| `profile-save` | `netlify/functions/profile-save.ts` | Persist onboarding/profile data, profile email, and expense categories **without mutating access role/status** | POST | pending/active user | profile tables | onboarding | CORE | keep (role/status preserved; lifecycle mutations belong to admin-user-role-update/admin-user-invite and admin approval/activation functions) |
| `scenario-save` | `netlify/functions/scenario-save.ts` | Save scenario model assumptions/results | POST | active_user+ | scenarios | scenarios page | SCENARIO | keep |
| `rent-room-get` | `netlify/functions/rent-room-get.ts` | Fetch the latest room rental scenario, or one scenario by id | GET | active_user+ (`requireActiveUser`) | current user's room rental scenario data only | report page, rent room tool | ROOM_RENTAL_SCENARIO | keep + conceptually rename |
| `rent-room-list` | `netlify/functions/rent-room-list.ts` | List saved room rental scenarios for recall/edit | GET | active_user+ (`requireActiveUser`) | current user's room rental scenario data only | rent room tool | ROOM_RENTAL_SCENARIO | keep |
| `rent-room-save` | `netlify/functions/rent-room-save.ts` | Create a new room rental scenario or update an owned scenario by id | POST | active_user+ | current user's room rental scenario data only | rent room tool | ROOM_RENTAL_SCENARIO | keep + conceptually rename |
| `rent-room-delete` | `netlify/functions/rent-room-delete.ts` | Delete one owned room rental scenario | POST/DELETE | active_user+ (`requireActiveUser`) | current user's room rental scenario data only | rent room tool | ROOM_RENTAL_SCENARIO | keep |
| `loan-readiness-save` | `netlify/functions/loan-readiness-save.ts` | Save/upsert premium loan readiness application for backward compatibility and saved report support | POST | premium_user+ | loan_readiness_applications | legacy readiness save/report flow | LOAN_READINESS | keep |
| `loan-readiness-get` | `netlify/functions/loan-readiness-get.ts` | Fetch latest user loan readiness application for backward compatibility and saved report support | GET | premium_user+ | loan_readiness_applications | legacy readiness save/report flow | LOAN_READINESS | keep |
| `loan-readiness-report-create` | `netlify/functions/loan-readiness-report-create.ts` | Create saved report snapshot from latest readiness application | POST | premium_user+ | loan_readiness_applications, reports | legacy readiness save/report flow | LOAN_READINESS | keep |
| `dividend-calculator-save` | `netlify/functions/dividend-calculator-save.ts` | Create or update a user's saved Dividend Reinvestment Calculator basket/projection | POST | premium_user/advisor/admin/superadmin | dividend_calculator_saves | dividend reinvestment calculator | PREMIUM_TOOL | keep |
| `dividend-calculator-list` | `netlify/functions/dividend-calculator-list.ts` | List lightweight saved dividend projections for the current user | GET | premium_user/advisor/admin/superadmin | dividend_calculator_saves | dividend reinvestment calculator | PREMIUM_TOOL | keep |
| `dividend-calculator-get` | `netlify/functions/dividend-calculator-get.ts` | Fetch one full saved dividend projection owned by the current user | GET | premium_user/advisor/admin/superadmin | dividend_calculator_saves | dividend reinvestment calculator | PREMIUM_TOOL | keep |
| `dividend-calculator-delete` | `netlify/functions/dividend-calculator-delete.ts` | Delete one saved dividend projection owned by the current user | POST/DELETE | premium_user/advisor/admin/superadmin | dividend_calculator_saves | dividend reinvestment calculator | PREMIUM_TOOL | keep |
| `dividend-yield-lookup` | `netlify/functions/dividend-yield-lookup.ts` | Look up dividend yield through the internal DB cache, refreshing from Alpha Vantage server-side only when stale/missing | GET | premium_user/advisor/admin/superadmin | dividend_yield_cache | dividend reinvestment calculator | PREMIUM_TOOL | keep |
| `dividend-yield-refresh` | `netlify/functions/dividend-yield-refresh.ts` | Admin-triggered cache refresh for stale tickers used in saved dividend portfolios, batch limited for provider quota safety | POST | admin/superadmin | dividend_yield_cache, dividend_calculator_saves | admin/manual ops | ADMIN | keep |
| `dividend-yield-cache-list` | `netlify/functions/dividend-yield-cache-list.ts` | Admin cache inspection endpoint for dividend yield cache freshness/status | GET | admin/superadmin | dividend_yield_cache | admin/future tools | ADMIN | document |
| `investment-analyzer-analyze` | `netlify/functions/investment-analyzer-analyze.ts` | Cache-first historical backtest analyzer; one daily adjusted provider refresh per stale/missing ticker, then derives historical price, latest price, and dividends from cached series | POST | premium_user/advisor/admin/superadmin | market_price_history, market_data_sync_status | investment analyzer | PREMIUM_TOOL | keep |
| `market-data-refresh-ticker` | `netlify/functions/market-data-refresh-ticker.ts` | Force-refresh one ticker's daily adjusted series into the market data cache for admin testing/maintenance | POST | admin/superadmin | market_price_history, market_data_sync_status | admin/manual ops | ADMIN | keep |

## Loan readiness calculation contract
- `loan-readiness-save` accepts canonical fields for income source, non-housing living expenses, housing payment, monthly debt payments, total monthly obligations, monthly surplus, DTI, housing ratio, total monthly pressure, savings runway, and down payment percent.
- `loan-readiness-report-create` snapshots the same canonical fields under `report_json.canonicalSummary` so saved report output can preserve the legacy readiness labels and values.

## Loan application calculation contract
- `/app/loan-application` is now the primary bank-facing Loan Application Preparation Form.
- `mapProfileToCNBApplication` uses total monthly income as the default ratio base: applicant income plus rental, investment, other recurring, and co-applicant placeholder income.
- Loan application ratios are DTI = debt payments / total monthly income, housing ratio = housing payment / total monthly income, and total monthly pressure = total obligations / total monthly income.

| `report-create` | `netlify/functions/report-create.ts` | Generate persisted report artifacts with report version, generated timestamp, assumptions, source context, and disclaimer metadata | POST | active_user+ | reports | reports page | CORE | keep |
| `action-plan-generate` | `netlify/functions/action-plan-generate.ts` | Create actionable plan from profile | POST | active_user+ | action plans/report data | action-plan page | CORE | keep |
| `advisor-request-save` | `netlify/functions/advisor-request-save.ts` | Create advisor assistance request after explicit data-sharing consent; stores consent metadata in `data_sharing_consents` and `recommendation_json` | POST | active_user (computed from approved+active status) | advisor requests, data sharing consents | advisor/request | ADVISOR | keep |
| `advisor-requests-my` | `netlify/functions/advisor-requests-my.ts` | List request status for requesting user | GET | active_user (computed from approved+active status) | advisor requests | advisor/status | ADVISOR | keep |
| `advisor-request-detail` | `netlify/functions/advisor-request-detail.ts` | Fetch single advisor request with assignment metadata | GET | assigned advisor by id/email or admin/superadmin | advisor requests + assignment fields | advisor/request detail | ADVISOR | keep |
| `advisor-requests-list` | `netlify/functions/advisor-requests-list.ts` | List advisor requests (broad) | GET | advisor/admin | advisor requests | internal | ADVISOR | protect |
| `advisor-requests-assigned` | `netlify/functions/advisor-requests-assigned.ts` | Advisor queue scoped to assignee by `assigned_advisor_email` OR `assigned_advisor_id` (admin/superadmin can view broader list) | GET | advisor/admin/superadmin | advisor assignments/status/notes | advisor/dashboard | ADVISOR | keep |
| `advisor-request-update` | `netlify/functions/advisor-request-update.ts` | Advisor status/notes update, enforcing assigned advisor by id/email (or admin/superadmin) | POST | assigned advisor by id/email or admin/superadmin | advisor requests status/notes | advisor/dashboard | ADVISOR | keep |
| `admin-advisor-requests-list` | `netlify/functions/admin-advisor-requests-list.ts` | Admin list/triage advisor requests with assignment fields (`assigned_advisor_id`, `assigned_advisor_email`, `assigned_at`, `assigned_by`, `assigned_advisor_name`) | GET | admin/superadmin | advisor requests + assignment join | admin tools | ADMIN | keep |
| `admin-advisor-request-update` | `netlify/functions/admin-advisor-request-update.ts` | Admin override of advisor request status/notes | POST | admin/superadmin | advisor requests | admin tools | ADMIN | keep |
| `admin-advisor-request-assign` | `netlify/functions/admin-advisor-request-assign.ts` | Assign/reassign advisor to request; eligible assignee roles: advisor/admin/superadmin; returns updated assignment payload for immediate UI refresh | POST | admin/superadmin | advisor assignments/status fields | admin/accounts | ADMIN | keep |
| `admin-advisors-list` | `netlify/functions/admin-advisors-list.ts` | List advisor accounts | GET | admin | users/roles | admin/accounts | ACCESS_CONTROL | keep |
| `admin-users-list` | `netlify/functions/admin-users-list.ts` | List users and statuses | GET | admin | users/status | admin/accounts | ACCESS_CONTROL | keep |
| `admin-user-approve` | `netlify/functions/admin-user-approve.ts` | Approve pending user | POST | admin | user access status | admin/accounts | ACCESS_CONTROL | keep |
| `admin-user-reject` | `netlify/functions/admin-user-reject.ts` | Reject pending user | POST | admin | user access status | admin/accounts | ACCESS_CONTROL | keep |
| `admin-user-activate` | `netlify/functions/admin-user-activate.ts` | Reactivate user | POST | admin | user access status | admin/accounts | ACCESS_CONTROL | keep |
| `admin-user-deactivate` | `netlify/functions/admin-user-deactivate.ts` | Deactivate active user | POST | admin | user access status | admin/accounts | ACCESS_CONTROL | keep |
| `admin-user-role-update` | `netlify/functions/admin-user-role-update.ts` | Change user role (`user`/`premium_user`/`advisor`/`admin`/`superadmin`, no legacy alias) | POST | admin/superadmin | roles/access | admin/accounts | ADMIN | protect |
| `admin-user-invite` | `netlify/functions/admin-user-invite.ts` | Invite user/staff | POST | admin | users/invites | admin/accounts | ADMIN | document |
| `_identity` / `_admin` / `_approval` / `_utils` | `netlify/functions/_*.ts` | Shared auth/admin helper modules | n/a | n/a | support utilities | all function modules | UTILITY | keep |

## Naming Guidance
- Keep deployed endpoints `rent-room-get` and `rent-room-save` intact.
- Rent-a-Room scenario library endpoints enforce owner-only access through `requireActiveUser` plus `user_id` filters. Missing or non-owned scenario ids return 404.
- Introduce **conceptual/UI naming** as `room-rental-scenario-get/save` in docs and labels first.
- If future refactor occurs, add backward-compatible aliases before changing callers.


## Shared enforcement helper
- `netlify/functions/_access.ts` centralizes auth/role/status gates (`getCurrentUser`, `requireAuth`, `requireActiveUser`, `requirePremiumUser`, `requireAdvisor`, `requireAdmin`, `requireAssignedAdvisorOrAdmin`) and is the default path for function-level access checks.
- Market-data API keys remain server-side. Dividend yield lookup uses `dividend_yield_cache`, and Investment Analyzer backtests use `market_price_history` plus `market_data_sync_status`; downloaded/provider market datasets must not be committed to the repository.
- TODO: Add a quota-aware saved-ticker batch refresh job after saved investment analyses exist. It should scan saved investment/dividend portfolios, refresh only stale tickers, and cap batch size for Alpha Vantage limits.


## Advisor artifact payload contract
- `advisor-request-save` accepts and stores `sourceContext`, `prequalificationShareUrl`, and `recommendation`/`recommendationJson` payloads for downstream advisor detail rendering.
- `advisor-request-save` requires `consentToReview: true` before any advisor/bank sharing request can be created.
- `advisor-request-detail` returns assignment metadata, artifact metadata (`loan_readiness_application_id`, `loan_readiness_report_id`, `artifact_type`), and safe nullable artifact fields.
- Advisors can view assigned cases only. Admins/superadmins can view, assign, and update advisor workflows. Admin override updates currently use `admin-advisor-request-update`; advisor-scoped updates use `advisor-request-update`.


## Admin analytics dependencies
- Admin analytics UI currently derives metrics from `admin-users-list` payload (`users`, `advisorRequests`) and does not expose per-user financial detail.
