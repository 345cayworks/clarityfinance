# Privacy Policy Draft

This draft is for product planning and legal review. It is not legal advice.

## Overview

Clarity Finance helps users organize financial information, model planning scenarios, prepare lender conversations, request advisor review, and create readiness reports. This draft describes the intended privacy posture and must be reviewed by qualified counsel before publication.

## Data Clarity Finance Collects

Clarity Finance may collect:

- Account and authentication information, including name, email, role, approval status, account status, activity timestamps, and authentication identifiers.
- Financial profile information, including income, expenses, debts, housing, savings, goals, banking relationship information, credit profile indicators, and document checklist status.
- Scenario inputs and outputs, including mortgage, refinance, rent-room, retirement, debt, cash-flow, investment, and dividend planning assumptions.
- Reports and generated artifacts, including report type, report version, generated date/time, assumptions, disclaimers, and user-entered financial snapshots.
- Loan readiness information, including requested amount, loan purpose, readiness score/band, ratios, monthly summary, missing documents, and application snapshots.
- Advisor requests, including contact preferences, messages, topic, urgency, source context, recommendation summaries, status, advisor notes, assignment fields, and related artifact links.
- Consent records, including recipient type/name, source context, artifact id when available, consent text, consent version, shared scope, and timestamp.
- Administrative records, including user lifecycle actions, role updates, advisor assignment, and audit logs.

## How Data Is Used

Data is used to:

- Provide the Clarity Finance workspace and planning tools.
- Calculate educational readiness ratios and planning estimates.
- Generate reports and document checklists.
- Support advisor review and follow-up when requested by the user.
- Manage account access, premium feature boundaries, advisor workflows, and admin operations.
- Protect the platform through access controls, operational logs, and audit records.
- Improve demo readiness, troubleshooting, product reliability, and compliance review.

## How Data Is Shared

Clarity Finance should not share user financial information with advisors, banks, or financial institutions unless the user gives explicit consent or sharing is otherwise required by law. When the user consents, the shared scope should be limited to the selected readiness summary, financial snapshot, supporting information, and related artifact references needed for review.

Clarity Finance may use service providers for hosting, authentication, database, communications, payments, monitoring, and related operations. Vendor and bank partner data processing terms should be reviewed before production partner integrations.

## Consent Before Advisor or Bank Sharing

Users must authorize Clarity Finance before advisor or bank sharing. Consent records should include:

- User id.
- Recipient type.
- Recipient name.
- Source context.
- Artifact id or report id when available.
- Consent text.
- Consent version.
- Shared scope.
- Timestamp.

## Role-Based Access

Access is controlled through stored roles, account approval status, account activation status, and computed runtime access state. Advisors should only access assigned cases. Admins and superadmins can manage account and advisor workflows for operational purposes. Sensitive server-side actions should be protected by Netlify Function authorization helpers.

## Data Retention

Retention periods must be finalized with legal counsel. Clarity Finance should retain data only as long as needed for service delivery, legal obligations, audit integrity, fraud prevention, security, dispute resolution, and legitimate operational needs.

## Data Deletion and Export Requests

Users should be able to request a data export or deletion through support while automated tooling is being completed. Deletion may exclude records that must be retained for legal, security, audit, transaction, or fraud-prevention reasons. A formal identity verification and admin review workflow should be implemented before automated deletion.

## Security Overview

Clarity Finance uses role-based access controls, server-side Netlify Function gates, advisor assignment scoping, and audit logging for sensitive actions. Secrets must remain server-side and should be managed through environment variables. Production security review should validate encryption at rest, transport security, monitoring, vendor controls, backup practices, and incident response procedures.

## Contact Placeholder

Privacy contact: `privacy@example.com`

Support contact: `support@example.com`

## Legal Review Required

This draft must be reviewed and approved by qualified legal counsel before publication or customer use.
