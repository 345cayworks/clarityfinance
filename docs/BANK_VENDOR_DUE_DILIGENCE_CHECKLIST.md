# Bank Vendor Due Diligence Checklist

## Security Overview

- Document application architecture.
- Confirm secrets are stored in environment variables.
- Confirm sensitive server-side operations use Netlify Functions.
- Validate TLS, encryption at rest, backup, and monitoring posture.

## Data Processing

- Document data collected from users.
- Document report generation and readiness calculations.
- Document advisor request and assignment workflow.
- Confirm no underwriting decision is made inside Clarity Finance.

## Subprocessors and Vendors

- Hosting provider: Netlify.
- Authentication provider: Netlify Identity.
- Database provider: placeholder for production database vendor.
- Payment provider: placeholder for advisor payment workflow where applicable.
- Email/notification provider: placeholder.
- Monitoring provider: placeholder.

## Hosting and Database Notes

- Confirm production environment boundaries.
- Confirm database region and backup policy.
- Confirm encryption-at-rest claims with database provider.
- Confirm database access controls and admin access process.

## Authentication Provider

- Confirm identity provider configuration.
- Confirm password reset and recovery workflow.
- Confirm role and account status are controlled by server-side admin functions.

## Data Retention

- Define retention periods for financial profile data.
- Define retention periods for reports and advisor requests.
- Define retention periods for audit logs and consent records.
- Define legal hold process.

## Data Deletion and Export

- Provide user request workflow.
- Provide admin review workflow.
- Document records that may be retained for audit/legal reasons.
- Confirm deletion is not run manually without an approved process.

## Incident Response

- Draft breach response plan.
- Define escalation contacts.
- Define bank partner notification expectations.
- Define production monitoring and alerting.

## Access Controls

- Role-based access documented.
- Approval status and account status documented.
- Premium access boundaries documented.
- Server-side Netlify Function gates documented.

## Advisor and Admin Boundaries

- Advisors access assigned cases only.
- Admins/superadmins manage accounts, requests, and assignments.
- Admin analytics should remain aggregate where possible.
- Sensitive admin/advisor mutations are audit logged.

## Consent to Share Data

- Consent required before advisor or bank sharing.
- Consent records include recipient, source context, consent text/version, shared scope, and timestamp.
- Shared packet should be limited to selected readiness summary, financial snapshot, and supporting information.

## Report Disclaimers

- Reports are based on user-entered information.
- Reports include generated timestamp, type, version, assumptions, source context, and disclaimer.
- Reports are not loan approvals, credit decisions, or investment advice.

## Legal and Compliance Review

- Privacy policy draft requires legal review.
- Terms of use draft requires legal review.
- Bank partner workflow requires compliance review.
- DPA review placeholder must be completed before production bank integrations.

## Bank-Specific Underwriting Disclaimer

Clarity Finance is a customer preparation and readiness platform, not an underwriting engine. Final approval is subject to the bank's independent underwriting, verification, documentation, credit criteria, collateral review, and applicable law.

## Production Monitoring and Support Expectations

- Define uptime/support expectations.
- Define incident response time targets.
- Define bank partner support contacts.
- Define release/change management process.
