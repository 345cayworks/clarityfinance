# Netlify Function Map

| Function | File path | Purpose | Method | Role required | Data touched | Frontend callers | Classification | Recommendation |
|---|---|---|---|---|---|---|---|---|
| `account-status` | `netlify/functions/account-status.ts` | Resolve auth/account gating state | GET | authenticated | user status/access | workspace guard | ACCESS_CONTROL | keep + protect |
| `activity-ping` | `netlify/functions/activity-ping.ts` | Update recent activity heartbeat | POST | authenticated | user session/activity | workspace guard | UTILITY | keep + document |
| `me` | `netlify/functions/me.ts` | Return current user identity/role | GET | authenticated | user identity | admin page | ACCESS_CONTROL | keep |
| `profile-get` | `netlify/functions/profile-get.ts` | Fetch financial profile aggregates | GET | approved user (pending support optional by policy) | profile tables | onboarding/dashboard/report/tools | CORE | keep |
| `profile-save` | `netlify/functions/profile-save.ts` | Persist onboarding/profile data **without mutating access role/status** | POST | pending/active user | profile tables | onboarding | CORE | keep (role/status preserved; lifecycle mutations belong to admin-user-role-update/admin-user-invite and admin approval/activation functions) |
| `scenario-save` | `netlify/functions/scenario-save.ts` | Save scenario model assumptions/results | POST | active_user+ | scenarios | scenarios page | SCENARIO | keep |
| `rent-room-get` | `netlify/functions/rent-room-get.ts` | Fetch room rental scenario inputs/results | GET | active_user+ (`requireActiveUser`) | room rental scenario data | report page | ROOM_RENTAL_SCENARIO | keep + conceptually rename |
| `rent-room-save` | `netlify/functions/rent-room-save.ts` | Save room rental cash-flow scenario | POST | active_user+ | room rental scenario data | rent room tool | ROOM_RENTAL_SCENARIO | keep + conceptually rename |
| `loan-readiness-save` | `netlify/functions/loan-readiness-save.ts` | Save/upsert premium loan readiness application | POST | premium_user+ | loan_readiness_applications | loan-readiness hub | LOAN_READINESS | keep |
| `loan-readiness-get` | `netlify/functions/loan-readiness-get.ts` | Fetch latest user loan readiness application | GET | premium_user+ | loan_readiness_applications | loan-readiness hub | LOAN_READINESS | keep |
| `loan-readiness-report-create` | `netlify/functions/loan-readiness-report-create.ts` | Create saved report snapshot from latest readiness application | POST | premium_user+ | loan_readiness_applications, reports | loan-readiness hub | LOAN_READINESS | keep |
| `report-create` | `netlify/functions/report-create.ts` | Generate persisted report artifacts | POST | active_user+ | reports | reports page | CORE | document |
| `action-plan-generate` | `netlify/functions/action-plan-generate.ts` | Create actionable plan from profile | POST | active_user+ | action plans/report data | action-plan page | CORE | keep |
| `advisor-request-save` | `netlify/functions/advisor-request-save.ts` | Create advisor assistance request | POST | active_user (computed from approved+active status) | advisor requests | advisor/request | ADVISOR | keep |
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
- Introduce **conceptual/UI naming** as `room-rental-scenario-get/save` in docs and labels first.
- If future refactor occurs, add backward-compatible aliases before changing callers.


## Shared enforcement helper
- `netlify/functions/_access.ts` centralizes auth/role/status gates (`getCurrentUser`, `requireAuth`, `requireActiveUser`, `requirePremiumUser`, `requireAdvisor`, `requireAdmin`, `requireAssignedAdvisorOrAdmin`) and is the default path for function-level access checks.


## Advisor artifact payload contract
- `advisor-request-save` accepts and stores `sourceContext`, `prequalificationShareUrl`, and `recommendation`/`recommendationJson` payloads for downstream advisor detail rendering.
- `advisor-request-detail` returns assignment metadata, artifact metadata (`loan_readiness_application_id`, `loan_readiness_report_id`, `artifact_type`), and safe nullable artifact fields.
