# Calculation Canon

## Definitions
- `nonHousingLivingExpenses` = utilities + water + transport + groceries + insurance + childcare + entertainment + travel + discretionary + other.
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
Monthly income: 5,000; housing: 1,500; utilities: 300; water: 50; transport: 400; groceries: 700; insurance: 250; childcare: 0; entertainment: 150; travel: 100; discretionary: 300; other: 200; debt payments: 600.
- nonHousingLivingExpenses = 2,450
- housingExpense = 1,500
- totalLivingExpenses = 3,950
- monthlyDebtPayments = 600
- totalMonthlyObligations = 4,550
- monthlySurplus = 450
- debtToIncome = 600 / 5,000 = 12%
- housingRatio = 1,500 / 5,000 = 30%
- totalMonthlyPressure = 4,550 / 5,000 = 91%

Interpretation: low DTI can still coincide with high total monthly pressure; both must be shown together.
