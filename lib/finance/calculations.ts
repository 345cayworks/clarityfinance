export const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const totalIncome = (incomeSources: Array<Record<string, unknown>>) =>
  incomeSources.reduce((sum, row) => sum + toNumber(row.monthly_amount), 0);

export const totalNonHousingExpenses = (expenseProfile: Record<string, unknown> | null) => {
  if (!expenseProfile) return 0;
  return (
    toNumber(expenseProfile.utilities) +
    toNumber(expenseProfile.transport) +
    toNumber(expenseProfile.groceries) +
    toNumber(expenseProfile.insurance) +
    toNumber(expenseProfile.childcare) +
    toNumber(expenseProfile.discretionary) +
    toNumber(expenseProfile.other)
  );
};

export const totalExpenses = (expenseProfile: Record<string, unknown> | null) => {
  if (!expenseProfile) return 0;
  return (
    toNumber(expenseProfile.housing) +
    toNumber(expenseProfile.utilities) +
    toNumber(expenseProfile.transport) +
    toNumber(expenseProfile.groceries) +
    toNumber(expenseProfile.insurance) +
    toNumber(expenseProfile.childcare) +
    toNumber(expenseProfile.discretionary) +
    toNumber(expenseProfile.other)
  );
};

export const housingPayment = (housingProfile: Record<string, unknown> | null) => {
  if (!housingProfile) return 0;
  return toNumber(housingProfile.mortgage_payment) || toNumber(housingProfile.rent_amount) || 0;
};

export const debtTotal = (debts: Array<Record<string, unknown>>) => debts.reduce((sum, row) => sum + toNumber(row.balance), 0);

export const monthlySurplus = (
  incomeSources: Array<Record<string, unknown>>,
  expenseProfile: Record<string, unknown> | null,
  housingProfile: Record<string, unknown> | null
) => totalIncome(incomeSources) - totalExpenses(expenseProfile) - housingPayment(housingProfile);

export const emergencyFundMonths = (savingsProfile: Record<string, unknown> | null, expenses: number) => {
  if (!savingsProfile || expenses <= 0) return 0;
  const emergencyFund = toNumber(savingsProfile.emergency_fund);
  return emergencyFund / expenses;
};

export const housingEquity = (housingProfile: Record<string, unknown> | null) => {
  if (!housingProfile) return 0;
  return toNumber(housingProfile.estimated_home_value) - toNumber(housingProfile.mortgage_balance);
};

export const monthlyDebtPayments = (debts: Array<Record<string, unknown>>) =>
  debts.reduce((sum, row) => sum + toNumber(row.monthly_payment), 0);

export const savingsRunwayMonths = (savingsProfile: Record<string, unknown> | null, expenseProfile: Record<string, unknown> | null) => {
  const monthlyExpenses = totalExpenses(expenseProfile);
  if (monthlyExpenses <= 0) return null;
  const cashAvailable = toNumber(savingsProfile?.cash_savings) + toNumber(savingsProfile?.emergency_fund);
  return cashAvailable / monthlyExpenses;
};

export const monthlyCashFlow = (income: number, expenses: number, debtPayments: number): number => {
  return income - expenses - debtPayments;
};

export const debtToIncomeRatio = (totalDebtPayments: number, income: number): number => {
  if (income <= 0) return 1;
  return totalDebtPayments / income;
};

export const financialStabilityScore = (cashFlow: number, dti: number, runwayMonths: number): number => {
  const cashScore = Math.max(0, Math.min(40, 20 + cashFlow / 100));
  const dtiScore = Math.max(0, Math.min(35, (1 - dti) * 35));
  const runwayScore = Math.max(0, Math.min(25, runwayMonths * 2.5));
  return Math.round(cashScore + dtiScore + runwayScore);
};

export const homeReadinessScore = (
  input: Record<string, unknown>
): number => {
  const targetHomePrice = toNumber(input.targetHomePrice);
  const target = targetHomePrice > 0 ? targetHomePrice : 350000;
  const downPaymentSavings = toNumber(input.downPaymentSavings);
  const downPaymentRatio = downPaymentSavings / (target * 0.2);
  const downPaymentScore = Math.max(0, Math.min(45, downPaymentRatio * 45));
  const dtiScore = Math.max(0, Math.min(35, (1 - toNumber(input.dti)) * 35));
  const isUnitedStates = Boolean(input.isUnitedStates);
  const creditScore = isUnitedStates ? Math.max(0, Math.min(20, (toNumber(input.creditScore ?? 680) - 580) / 7)) : 20;
  return Math.round(downPaymentScore + dtiScore + creditScore);
};

export const clarityScore = (financialStability: number, homeReadiness: number, profileCompletion: number): number => {
  return Math.round(financialStability * 0.5 + homeReadiness * 0.3 + profileCompletion * 0.2);
};

export const debtPayoffEstimates = (debts: Array<Record<string, unknown>>) => {
  const totalDebt = debts.reduce((sum, debt) => sum + toNumber(debt.balance), 0);
  const payment = debts.reduce((sum, debt) => sum + toNumber(debt.monthlyPayment ?? debt.monthly_payment), 0);
  const months = payment > 0 ? totalDebt / payment : 0;
  return {
    totalDebt,
    estimatedMonths: Math.ceil(months),
    snowballNote: "Snowball targets smallest balances first for momentum.",
    avalancheNote: "Avalanche targets highest rates first to minimize interest."
  };
};

export const rentRoomImpact = (cashFlow: number, roomIncome: number): { newCashFlow: number; improvement: number } => {
  return { newCashFlow: cashFlow + roomIncome, improvement: roomIncome };
};

export const toCurrency = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
