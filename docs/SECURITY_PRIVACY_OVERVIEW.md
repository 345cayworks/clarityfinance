# Security and Privacy Overview

## Data Collected

- Financial profile and onboarding information.
- Income, expenses, debts, housing, savings, and goals.
- Scenarios and planning assumptions.
- Reports and report snapshots.
- Loan readiness inputs, readiness scores, ratios, and document checklist status.
- Advisor requests, messages, recommendation payloads, consent metadata, assignments, notes, and statuses.
- Admin/account status fields, including role, approval status, account status, and activity timestamps.

## Access Controls

- Role-based access uses stored roles: `user`, `premium_user`, `advisor`, `admin`, and `superadmin`.
- Account lifecycle uses `approval_status` and `account_status`.
- Runtime access state is computed from identity plus approval and account status.
- Netlify Functions enforce server-side gates through `netlify/functions/_access.ts`.
- Premium server functions should use `requirePremiumOrStaff` when advisors/admins are permitted to access premium tools.

## Market Data Secrets

- Market data API keys are server-side environment variables only.
- `MASSIVE_API_KEY` supports the preferred MASSIVE provider.
- `ALPHA_VANTAGE_API_KEY` supports Alpha Vantage as fallback.
- `MARKET_DATA_PROVIDER` supports `alpha_vantage` and `massive`; when omitted, MASSIVE is preferred if configured and Alpha Vantage is used otherwise.
- Provider responses are cached in database tables such as `market_price_history`, `market_data_sync_status`, and `dividend_yield_cache`. Market data files and API keys must not be committed to the repository.
- Dividend Calculator manual entry remains available when market data is unavailable.

## Advisor Data Access

- Advisors can access advisor workflows only after account approval and activation.
- Advisors can view assigned cases only, scoped by assigned advisor email or id.
- Admins and superadmins may view and manage advisor requests for assignment and oversight.

## Admin Data Access

- Admin functions manage accounts, access lifecycle, roles, requests, advisor assignment, and operational follow-up.
- Admin analytics should remain aggregate where possible and avoid exposing unnecessary per-user financial detail.
- Admin actions should be protected by `requireAdmin` and written to audit logs where supported.

## User Consent

- Consent is required before sharing financial information with an advisor or bank.
- Consent metadata includes recipient type, recipient name, source context, artifact id when available, consent text, consent version, timestamp, and shared scope.
- The current consent version is `data-sharing-consent-v1`.

## Disclaimers

- Clarity Finance does not approve loans.
- Clarity Finance does not make credit decisions.
- Clarity Finance does not provide investment advice.
- Reports and tools are based on user-entered information and planning assumptions.
- Final lender approval is subject to lender review, verification, and underwriting.

## Future Compliance TODOs

- Formal privacy policy.
- Terms of use.
- Data deletion/export workflow.
- Expanded audit logs.
- Breach response plan.
- Encryption-at-rest validation depending on database provider.
- Production monitoring and alerting.
- DPA/vendor review for bank partners.
