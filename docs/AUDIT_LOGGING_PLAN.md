# Audit Logging Plan

## Goal

Audit logs should record sensitive access-control, advisor, admin, consent, and report actions without storing highly sensitive financial detail in audit metadata.

## Current Implementation

- Helper: `netlify/functions/_audit.ts`
- Migration: `sql/add-audit-log.sql`
- Table: `audit_logs`
- Existing admin audit viewer: `netlify/functions/admin-audit-logs.ts`

The helper supports legacy fields (`entity_type`, `entity_id`, `metadata`) and due-diligence fields (`actor_role`, `target_type`, `target_id`, `source_function`, `metadata_json`) for compatibility.

## Audit Table Fields

- `id`
- `actor_user_id`
- `actor_email`
- `actor_role`
- `action`
- `target_user_id`
- `target_email`
- `target_type`
- `target_id`
- `entity_type`
- `entity_id`
- `source_function`
- `metadata`
- `metadata_json`
- `created_at`

## Actions Currently Audited

- `admin-user-approve`
- `admin-user-reject`
- `admin-user-activate`
- `admin-user-deactivate`
- `admin-user-role-update`
- `admin-user-password-reset`
- `admin-user-invite`
- `admin-advisor-request-assign`
- `admin-advisor-request-update`
- `advisor-request-update`
- `advisor-request-save` when consent creates an advisor request
- `loan-readiness-report-create`
- `report-create`
- Admin audit log views

## Metadata Rules

Do store:

- Target ids.
- Target type.
- Previous and new status or role.
- Consent version.
- Recipient type/name.
- Report type/version.
- Source function.

Do not store:

- Full financial profiles.
- Full report JSON.
- Advisor notes content.
- Bank account numbers.
- Detailed debt/income records.
- Full documents or personally sensitive attachments.

## Remaining TODOs

- Add audit records for future data export/deletion request functions.
- Add audit records for any new bank partner sharing endpoints.
- Add retention policy for audit logs.
- Add monitoring/alerting for suspicious admin activity.
- Add bank partner review of audit event coverage.
