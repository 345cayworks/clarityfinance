# Loan Readiness Data Mapping (Duplication Audit + Consolidation)

This note documents overlapping profile/onboarding/prequalification columns and the consolidated mapping used by loan readiness, prequalification, loan application prep, and reports.

## Consolidation decisions

- **Income duplication**: recurring income comes from `income_sources.monthly_amount`; loan/prequal-specific snapshot values remain in `profiles.monthly_net_income` and `profiles.monthly_gross_income`.
- **Prequalification monthly income precedence**: `profiles.monthly_net_income` → `profiles.monthly_gross_income` → sum of `income_sources.monthly_amount`.
- **Housing payment overlap**: `expense_profiles.housing` is treated as total housing expense; `housing_profiles.rent_amount` and `housing_profiles.mortgage_payment` are detail values only.
- **Loan purpose overlap**: use `profiles.loan_purpose` for applications, fallback to `goals.target_goal`.
- **Down payment overlap**: use `profiles.down_payment_available` if present, fallback to `savings_profiles.down_payment_savings`.
- **Property value overlap**: purchase flow uses `profiles.purchase_price` when present, fallback to `goals.target_home_price`; `housing_profiles.estimated_home_value` is current property value.
- **Requested amount overlap**: use `profiles.requested_loan_amount`, fallback to calculated `purchasePrice - downPaymentAvailable`.

## Canonical table

| Field Purpose | Source of Truth | Fallbacks | Used In |
|---|---|---|---|
| Monthly income used for prequalification | `profiles.monthly_net_income` | `profiles.monthly_gross_income` → `sum(income_sources.monthly_amount)` | Proven prequalification, loan application prep, readiness report |
| Recurring income ledger | `income_sources.monthly_amount` | none | Onboarding income + all reports |
| Housing expense for ratios | `expense_profiles.housing` | `housing_profiles.mortgage_payment` → `housing_profiles.rent_amount` | Prequalification ratios, readiness report |
| Housing detail (rent/mortgage) | `housing_profiles.rent_amount`, `housing_profiles.mortgage_payment` | none | Prequalification and loan form details |
| Loan purpose | `profiles.loan_purpose` | `goals.target_goal` | Prequalification, loan application, readiness report |
| Down payment available | `profiles.down_payment_available` (optional) | `savings_profiles.down_payment_savings` | Prequalification, loan application, readiness report |
| Down payment savings balance | `savings_profiles.down_payment_savings` | none | Savings, readiness report |
| Purchase price for loan | `profiles.purchase_price` (optional) | `goals.target_home_price` | Prequalification + loan application |
| Current property value | `housing_profiles.estimated_home_value` | none | Housing/equity sections |
| Requested loan amount | `profiles.requested_loan_amount` | `purchasePrice - downPaymentAvailable` | Prequalification + loan application |
| Mortgage balance (existing property) | `housing_profiles.mortgage_balance` | none | Existing liabilities/equity only |
| Document readiness flags | `profiles.has_*` fields | none | Prequalification, loan application, readiness score/report |
