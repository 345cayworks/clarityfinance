# Data Model (Current + Canonical Next Phase)

## Current Model (from code usage)

### 1) User / account status
- Identity handled through Netlify Identity JWT.
- Access and role checks are enforced through `account-status`, `me`, and admin user lifecycle functions.
- Status states include pending/approved/active/deactivated patterns (based on admin approve/reject/activate/deactivate functions).

### 2) Financial profile
- Captured in onboarding and read by dashboard/report/tools via `profile-save` and `profile-get`.
- Contains personal details, employment/income, expenses, debt, savings, housing, goals, and loan-intent fields.

### 3) Scenarios
- General scenario assumptions and outputs saved via `scenario-save`.
- Used in scenario planning experience and report context.

### 4) Room rental scenario
- Persisted through `rent-room-save`; retrieved via `rent-room-get`.
- Includes setup costs, monthly rental income effects, and cash-flow impact for “Rent a Room Scenario”.

### 5) Advisor requests
- User creates requests (`advisor-request-save`), views status (`advisor-requests-my`), advisors process assigned work (`advisor-requests-assigned`, `advisor-request-update`), admins triage/assign (`admin-advisor-request-*`).

### 6) Admin / advisor assignments
- Admin functions manage user statuses, roles, and advisor assignment.
- Advisor dashboards should be scoped to assigned users/requests only.

### 7) Loan readiness
- UI routes exist (`/app/loan-application`, `/app/prequalification/proven-bank`) and currently rely on shared profile data.
- Dedicated loan-readiness persistence schema appears partially planned and should be formalized.

## Canonical Next-Phase Model Recommendation
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

## Modeling Notes
- Keep room-rental scenario as a **first-class bounded model**, not as generic rental management.
- Separate access-control metadata (`UserAccessStatus`) from personal finance data (`FinancialProfile`).
- Add explicit foreign-key constraints and status enums for advisor/admin workflow transitions.
