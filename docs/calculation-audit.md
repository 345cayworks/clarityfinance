# Calculation Audit

## Canonical formulas
- Monthly income: `monthly_net_income` → `monthly_gross_income` → sum of `incomeSources.monthly_amount` → `0`.
- Housing expense: `housingProfile.mortgage_payment` else `housingProfile.rent_amount`.
- Non-housing living expenses: utilities + water + transport + groceries + insurance + childcare + entertainment + travel + discretionary + other.
- Total living expenses: housing + non-housing.
- Debt payments: sum debts.monthly_payment.
- Total obligations: living + debt payments.
- Surplus: income - obligations.
- DTI: debt payments / income.
- Housing ratio: housing / income.
- Total obligation ratio: obligations / income.
- Total debt: sum debt balances excluding mortgage-type debt when `housingProfile.mortgage_balance` exists.
- Assets: cash + emergency + down payment + investments + retirement + estimated home value + other assets.
- Liabilities: mortgage balance + total debt.
- Net worth: assets - liabilities.
- Savings runway: (cash + emergency) / total living expenses, else `0` when expenses <= 0.

## Pages audited
- Dashboard, reports, prequalification, loan application, advisor/approval dependencies.

## Double-counting risks found
- Mortgage balance could be double-counted in debt balances and housing profile.
- Housing could be split across rent/mortgage and expense housing fields.
- Down payment savings can be counted twice if rolled into other balances.

## Fixes applied
- Added central canonical helper library at `lib/calculations/finance.ts`.
- Updated `lib/finance/calculations.ts` to delegate to canonical helpers and preserve compatibility.
- Added mortgage double-count protection in total debt and liabilities computations.
- Aligned savings runway to include cash + emergency over total living expenses.

## Remaining assumptions
- Existing UI/report code still uses compatibility wrappers in some places and should progressively import from `lib/calculations/finance.ts` directly.
- “Calculation Source Check” visibility should be tied to future role/admin controls; this audit keeps logic backend-safe and no auth changes.
