# Data Deletion and Export Plan

## Data That Can Be Exported

- Account profile and contact information.
- Financial profile tables: income, expenses, debts, housing, savings, and goals.
- Scenario inputs and outputs.
- Reports and report metadata.
- Loan readiness applications and document checklists.
- Advisor request records created by the user.
- Consent records associated with advisor or bank sharing.

## Data That Can Be Deleted

- User profile and financial profile data.
- Scenario records.
- Saved reports and generated artifacts.
- Loan readiness applications.
- Advisor requests, subject to operational, audit, legal, or advisor review constraints.
- Consent records where deletion is legally permissible.

## Data That May Need Retention

- Audit logs for admin/advisor actions.
- Payment or transaction references if added later.
- Security, fraud-prevention, legal hold, dispute, or compliance records.
- Records required by bank partner agreements or applicable law.
- Aggregated analytics that no longer identify the user.

## User Request Workflow

1. User opens Settings and reads the Data Export & Deletion section.
2. User contacts support with an export or deletion request.
3. Support verifies identity and request scope.
4. Admin reviews affected records and retention constraints.
5. Export is prepared or deletion is scheduled.
6. User receives confirmation and a summary of retained records, if any.

## Admin Review Workflow

- Confirm requester identity.
- Confirm account id and email.
- Identify affected tables and artifacts.
- Check for legal/audit/transaction retention requirements.
- Export data in a structured format before deletion if requested.
- Run deletion using an approved, tested server-side function or admin script.
- Write an audit log entry for the request and completion.

## Tables and Functions Likely Affected

- `users`
- `profiles`
- `income_sources`
- `expense_profiles`
- `debts`
- `housing_profiles`
- `savings_profiles`
- `goals`
- `scenarios`
- `rent_room_scenarios`
- `reports`
- `loan_readiness_applications`
- `advisor_requests`
- `data_sharing_consents`
- `audit_logs`
- `profile-get`
- `profile-save`
- `report-create`
- `loan-readiness-save`
- `advisor-request-save`
- Future: `data-export-create`, `data-deletion-request-create`, `admin-data-deletion-complete`

## Phased Implementation Plan

1. Phase 1: Add Settings placeholders and support workflow documentation.
2. Phase 2: Add admin-only request tracking for export/deletion requests.
3. Phase 3: Build non-destructive export function with verified user ownership.
4. Phase 4: Build staged deletion function with dry-run output and audit logging.
5. Phase 5: Add user-facing self-service request UI after legal review.

No destructive automated deletion should be implemented until the retention rules, audit requirements, identity verification, and rollback procedures are approved.
