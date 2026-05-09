# Data Model (Current + Canonical Access Mapping)

## Users table access fields

### `users.role` (stored role)
Canonical stored values:
- `user`
- `premium_user`
- `advisor`
- `admin`
- `superadmin`


### `users.approval_status` (lifecycle approval)
Values:
- `pending`
- `approved`
- `rejected`

### `users.account_status` (lifecycle activation)
Values:
- `active`
- `inactive`
- `deactivated`

---

## Computed access states (derived, not stored)

These states are computed at runtime from auth + status fields and must **not** be persisted as role values:

- `visitor`: unauthenticated.
- `pending_user`: authenticated but not fully approved/active.
- `active_user`: authenticated + approved + active.

Derived behavior:
- `pending_user` can complete onboarding/profile, but cannot use core dashboard/scenario/report/loan/admin/advisor-dashboard routes.
- `active_user` can access core workspace routes.
- premium/advisor/admin/superadmin capabilities are overlays on top of active status.

---

## Domain model summary

### 1) User / access
- Identity from Netlify Identity JWT.
- Access checks enforced through `netlify/functions/_access.ts` helpers.
- Admin lifecycle functions mutate `users.role`, `users.approval_status`, and `users.account_status`.

### 2) Financial profile
- Captured in onboarding and consumed by dashboard/report/tools via `profile-save` and `profile-get`.
- `profiles.email`: applicant contact email captured in Personal Information. Save falls back to the Netlify Identity email when the onboarding field is blank.
- `expense_profiles.water`, `expense_profiles.entertainment`, and `expense_profiles.travel`: monthly non-housing, non-debt living expense categories.

### 3) Scenarios
- General planning assumptions/outputs saved via `scenario-save`.

### 4) Room rental scenario
- Persisted through `rent-room-save`; retrieved via `rent-room-get`.

### 5) Advisor requests and assignment
- Created by users, reviewed by assigned advisors, triaged/assigned by admins.
- Advisor/bank sharing requires explicit consent. Consent metadata is stored in `data_sharing_consents` when available and embedded in advisor request `recommendation_json` for compatibility.

### 6) Loan readiness
- Premium-gated routes include `/app/loan-readiness`, `/app/loan-application`, and `/app/prequalification/proven-bank`.
- `/app/loan-application` is the primary bank-facing Loan Application Preparation Form.
- `/app/loan-readiness` is retained as a compatibility transition route and should not be treated as the primary user workflow.
- `loan_readiness_applications` stores readiness score/band, ratios, monthly summary, document checklist, missing docs, and saved application JSON.
- Advisor escalation is connected through `advisor-request-save` with source context `loan_readiness`.

#### Loan Readiness Calculation Definitions

- `monthlyIncomeUsed`: `profile.monthly_net_income` if greater than zero, else `profile.monthly_gross_income` if greater than zero, else sum of `income_sources.monthly_amount`, else `0`.
- `monthlyIncomeSource`: the source selected by the loan readiness income priority.
- `nonHousingLivingExpenses`: sum of expense profile `utilities`, `water`, `transport`, `groceries`, `insurance`, `childcare`, `entertainment`, `travel`, `discretionary`, and `other`; excludes housing and debt payments.
- `housingPayment`: `housing_profiles.mortgage_payment` if greater than zero, else `housing_profiles.rent_amount` if greater than zero, else `0`.
- `monthlyDebtPayments`: sum of `debts.monthly_payment`.
- `totalMonthlyObligations`: `housingPayment + nonHousingLivingExpenses + monthlyDebtPayments`.
- `monthlySurplus`: `monthlyIncomeUsed - totalMonthlyObligations`.
- `debtToIncome`: `monthlyDebtPayments / monthlyIncomeUsed`, or `null` when income is missing.
- `housingRatio`: `housingPayment / monthlyIncomeUsed`, or `null` when income is missing.
- `totalObligationsRatio`: `totalMonthlyObligations / monthlyIncomeUsed`, or `null` when income is missing.
- `savingsRunwayMonths`: `(cash_savings + emergency_fund) / (housingPayment + nonHousingLivingExpenses)`. Debt payments are not included in this runway estimate.
- `downPaymentPercent`: `downPaymentAvailable / purchasePrice`, only meaningful when purchase price is greater than zero.

For backward compatibility, the legacy `monthly_expenses` column continues to represent `nonHousingLivingExpenses`; the canonical fields are also stored in `application_json`.

#### Loan Application Calculation Definitions

The Loan Application Form uses total monthly income as the default base for affordability ratios.

- `totalMonthlyIncome`: `applicantIncome + rentalIncome + investmentIncome + otherIncome + coApplicantIncome`.
- `applicantIncome`: `profile.monthly_net_income` if greater than zero, else `profile.monthly_gross_income` if greater than zero, else sum of `income_sources.monthly_amount`.
- `rentalIncome`: `housing_profiles.estimated_room_rental_income`, else `profile.rental_income`, else rental/room income source rows when income sources were not already used as applicant income.
- `investmentIncome`: `profile.investment_income`, else investment/dividend income source rows when income sources were not already used as applicant income.
- `otherIncome`: `profile.other_income_amount`, else other recurring income source rows when income sources were not already used as applicant income.
- `coApplicantIncome`: currently `0` placeholder until co-applicant fields are implemented.
- `nonHousingLivingExpenses`: utilities, water, transport, groceries, insurance, childcare, entertainment, travel, discretionary, and other living expenses only.
- `housingPayment`: mortgage payment if present, else rent amount.
- `monthlyDebtPayments`: sum of debt monthly payments.
- `totalMonthlyObligations`: `housingPayment + nonHousingLivingExpenses + monthlyDebtPayments`.
- `monthlySurplus`: `totalMonthlyIncome - totalMonthlyObligations`.
- `debtToIncome`: `monthlyDebtPayments / totalMonthlyIncome`, or `null` when total income is missing.
- `housingRatio`: `housingPayment / totalMonthlyIncome`, or `null` when total income is missing.
- `totalMonthlyPressure`: `totalMonthlyObligations / totalMonthlyIncome`, or `null` when total income is missing.
- `netWorth`: total assets minus total liabilities.

### 7) Reports
- `reports` stores report artifacts and metadata.
- Current metadata fields include `report_version`, `generated_at`, `assumptions_json`, `disclaimer_text`, and `source_context` where the migration has been applied.

### 8) Dividend calculator saves
- `dividend_calculator_saves` stores user-entered Dividend Reinvestment Calculator positions, calculator settings, summary output, and projection output.
- Rows are scoped by `user_id`; premium users, advisors, admins, and superadmins can save/load their own projections through premium-tool functions.
- Stored data is manual-input planning data only: no API keys, external market data, or unnecessary personal profile data.
- Metadata includes report version, assumptions JSON, and the educational-only disclaimer used for saved calculator projections.

### 9) Dividend yield cache
- `dividend_yield_cache` stores normalized ticker-level dividend yield lookup results fetched server-side through provider functions.
- It includes ticker, optional company name, dividend yield percent, annual dividend per share, payout frequency if known, source, raw provider JSON, fetch timestamps, and expiry metadata.
- Cache freshness defaults to 24 hours. `expires_at` is preferred when present; otherwise functions evaluate `fetched_at`.
- Market data is cached in the database only and is not stored in GitHub. API keys are never exposed to React components.
- Dividend yield lookup is optional; users can always enter or override yield values manually in the calculator.

### 10) Historical market data cache
- `market_price_history` stores daily adjusted market data by `(ticker, price_date)` for Investment Analyzer backtesting.
- Cached rows include close price, adjusted close price, dividend amount, split coefficient, source, fetch timestamp, and raw provider JSON when available.
- `market_data_sync_status` tracks ticker-level provider sync state, last full refresh time, latest cached trading date, and the last error message.
- Cache freshness defaults to 24 hours from `last_full_refresh_at`; stale cached data can still be used if the provider fails.
- Historical market data is stored in the database cache and reused for backtesting. Market data files are not committed to the repository.

## Canonical next-phase model recommendation
1. **User**
2. **UserAccessStatus**
3. **FinancialProfile**
4. **Scenario**
5. **RoomRentalScenario**
6. **LoanReadinessApplication**
7. **AdvisorRequest**
8. **AdvisorAssignment**
9. **DividendYieldCache**
10. **HistoricalMarketDataCache**
11. **DividendCalculatorSave**
12. **ActionPlan**
13. **Report**


> Note: `premium` was considered as a legacy alias, but it is not valid in the live `UserRole` enum.


## Advisor request artifact fields
Expected advisor request fields (nullable):
- `source_context`: one of `advisor-request`, `loan_readiness`, `prequalification`, `report`, `action_plan`.
- `prequalification_share_url`: optional protected/internal URL to an artifact; if absent the UI shows a missing-artifact guidance state.
- `recommendation_json`: structured object used for advisor summaries (readiness score/band, urgency/package, key notes, monthly surplus, DTI, housing ratio, total monthly pressure, missing documents).
- Optional linking fields if present in schema: `loan_readiness_application_id`, `loan_readiness_report_id`, `artifact_type`.
- Consent metadata includes recipient type/name, source context, artifact id when available, consent text/version, timestamp, and shared scope.

## Data sharing consent table
Expected consent fields:
- `id`
- `user_id`
- `recipient_type`
- `recipient_name`
- `source_context`
- `artifact_id`
- `consent_text`
- `consent_version`
- `shared_scope_json`
- `created_at`


## Admin analytics aggregate model
- Admin analytics uses aggregate counts only (roles, account lifecycle, advisor request statuses, recent activity windows, and coarse trend windows).
- Loan readiness funnel stages are shown as `Not enough data yet` until a secure admin aggregate source is added for cross-user loan-readiness/report counts.
