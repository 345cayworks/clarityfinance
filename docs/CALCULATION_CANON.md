# Calculation Canon

## Definitions
- `nonHousingLivingExpenses` = utilities + transport + groceries + insurance + childcare + discretionary + other.
- `housingExpense` = mortgage_payment if present, else rent_amount, else 0.
- `totalLivingExpenses` = nonHousingLivingExpenses + housingExpense.
- `monthlyDebtPayments` = sum of `debts.monthly_payment` only (contractual debt servicing only).
- `totalMonthlyObligations` = totalLivingExpenses + monthlyDebtPayments.
- `monthlySurplus` = monthlyIncomeUsed - totalMonthlyObligations.
- `debtToIncome` = monthlyDebtPayments / monthlyIncomeUsed.
- `housingRatio` = housingExpense / monthlyIncomeUsed.
- `totalObligationsRatio` = totalMonthlyObligations / monthlyIncomeUsed.

## Debt pressure interpretation
Bands: Healthy, Watch, Stressed, Critical.
- DTI: <=0.25 Healthy, <=0.35 Watch, <=0.45 Stressed, >0.45 Critical.
- Housing ratio: <=0.30 Healthy, <=0.40 Watch, <=0.50 Stressed, >0.50 Critical.
- Total obligations ratio: <=0.60 Healthy, <=0.75 Watch, <=0.90 Stressed, >0.90 Critical.
- Monthly surplus: positive and >=20% income Healthy, positive below 20% Watch, negative Stressed/Critical by severity.

## Included / excluded fields
- DTI includes only debt servicing (`debts.monthly_payment`).
- DTI excludes rent/mortgage and living expenses.
- Total monthly pressure includes living expenses + housing + debt servicing.
- Housing ratio is separate from DTI to isolate shelter-cost concentration risk.

## Example
Income: 8,000; non-housing: 2,500; housing: 2,000; debt payments: 1,200.
- totalLivingExpenses = 4,500
- totalMonthlyObligations = 5,700
- monthlySurplus = 2,300
- DTI = 1,200 / 8,000 = 15%
- housingRatio = 2,000 / 8,000 = 25%
- totalObligationsRatio = 5,700 / 8,000 = 71.25%
