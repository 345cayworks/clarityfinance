# Pre-Pitch Readiness

Clarity Finance should be presented as a financial readiness and preparation platform, not as a lender, underwriting engine, investment advisor, or credit decision system.

## Demo Accounts Needed

- Standard user: active account with completed onboarding profile.
- Premium user: active account with premium tools enabled.
- Advisor: active advisor account with at least one assigned request.
- Admin: active admin account for account, assignment, and status workflows.

Do not store real demo credentials in the repository.

## Demo Script Path

1. Sign in as a standard user and show dashboard/profile readiness inputs.
2. Open `/app/tools` and show premium tools as visible but locked.
3. Sign in as a premium user and show Loan Readiness, Reports, Investment Analyzer, and Dividend Reinvestment Calculator.
4. Show report metadata: generated time, report type, version, assumptions, and disclaimers.
5. Request advisor review only after checking the data-sharing consent box.
6. Sign in as advisor and show assigned requests only.
7. Sign in as admin and show user lifecycle, advisor assignment, and account controls.

## Access Control Checklist

- Unauthenticated visitors cannot access `/app/**`.
- Pending users cannot access dashboard, reports, tools, admin, or advisor dashboard.
- Standard users can see locked premium cards but cannot use premium tools.
- Premium users can use premium planning tools.
- Advisors can access assigned advisor requests.
- Admins and superadmins can manage accounts and advisor assignments.

## Data Privacy Talking Points

- Sensitive financial logic stays server-side in Netlify Functions where persistence or privileged access is needed.
- Users must consent before advisor or bank sharing.
- Advisor access is scoped to assigned cases.
- Admin analytics should remain aggregate where possible.
- No secrets should be exposed in frontend code.

## Bank Compliance Talking Points

- Clarity Finance is a customer preparation and readiness tool.
- It does not approve loans, issue credit decisions, or replace lender underwriting.
- Readiness outputs are based on user-entered information and planning assumptions.
- Final approval is subject to lender review, verification, and underwriting.

## Features Safe to Demo

- Financial profile and onboarding.
- Cash flow, debt pressure, and readiness indicators.
- Reports with disclaimers and version metadata.
- Document checklist and missing-document guidance.
- Advisor request consent workflow.
- Premium gates for advanced planning tools.
- Admin user lifecycle and advisor assignment controls.

## Features to Avoid Leading With

- Historical investment what-if outputs without first stating they are educational and not investment advice.
- Any phrasing that implies the user qualifies for a loan.
- Any implied bank approval before lender underwriting.
- Any real customer financial data.

## Known Limitations

- Formal privacy policy and terms of use are still needed.
- Data export/deletion workflows should be added before broad production launch.
- More complete audit logs should cover all advisor and admin changes.
- Bank partner DPA/vendor review should happen before production partner integrations.
