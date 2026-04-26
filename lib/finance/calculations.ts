export const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const totalIncome = (incomeSources: Array<Record<string, unknown>>) =>
  incomeSources.reduce((sum, row) => sum + toNumber(row.monthly_amount), 0);

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

export const debtTotal = (debts: Array<Record<string, unknown>>) => debts.reduce((sum, row) => sum + toNumber(row.balance), 0);

export const monthlySurplus = (incomeSources: Array<Record<string, unknown>>, expenseProfile: Record<string, unknown> | null) =>
  totalIncome(incomeSources) - totalExpenses(expenseProfile);

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

export const toCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
