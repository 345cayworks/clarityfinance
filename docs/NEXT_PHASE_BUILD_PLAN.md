# Next Phase Build Plan

## Phase 1: Canon stabilization and route/function documentation
- Lock product canon (Cayman-focused gated finance + scenario planning).
- Complete route and function maps and keep synced with deploy.
- Align labels to canonical terminology (e.g., “Rent a Room Scenario”).

## Phase 2: Strengthen gated access and role checks
- Enforce centralized route guard decisions by role + status.
- Ensure server-side function checks mirror UI guards.
- Add tests for pending/active/premium/advisor/admin flows.
- Establish profile/onboarding `household_expenses` as the single source of truth (Enter once. Use everywhere.).
- Prevent duplicate household expense entry UIs inside Loan Readiness Hub; consume shared profile data instead.
- Ensure Loan Readiness, Advisor Review, Admin reporting, and future PDF/report generation all read the same household expense records.

## Phase 3: Improve dashboard and scenario planning UX
- Clarify baseline financial health cards and trends.
- Improve scenario comparison UX with monthly cash-flow deltas.
- Remove dead-end or unused navigation actions.

## Phase 4: Formalize Room Rental Cash Flow Scenario
- Promote scenario as core Cayman module across dashboard/report/tool naming.
- Add dedicated summary card to scenario/report views.
- Standardize data contract for room-rental inputs and outputs.

## Phase 5: Add Loan Readiness plug-in
- ✅ Introduced `/app/loan-readiness` premium hub route architecture and `loan_readiness_applications` storage model.
- ✅ Added progress checklist + readiness score/band summary and document gap detection.
- ✅ Connected advisor review and report snapshot creation (`loan-readiness-report-create`).

## Phase 6: Advisor/Admin workflow refinement
- Restrict advisors to assigned users only.
- Strengthen admin controls for approve/deactivate/assign actions.
- Improve request queue visibility and auditability.

## Acceptance Criteria
- User cannot access app unless approved/active.
- Premium-only features are clearly gated.
- Room rental scenario saves and displays correctly.
- Scenario impact updates cash-flow projections.
- Loan readiness module has a clear route and data model.
- Advisors only see assigned users.
- Admins can approve, deactivate, and assign users.
- No broken navigation.
- No unused buttons.
- All functions have documented callers.
