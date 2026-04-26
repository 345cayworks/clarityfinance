export type ProfileBundle = {
  incomeSources: Array<Record<string, unknown>>;
  expenseProfile: Record<string, unknown> | null;
  debts: Array<Record<string, unknown>>;
  housingProfile: Record<string, unknown> | null;
  savingsProfile: Record<string, unknown> | null;
};

const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const totalIncome = (incomeSources: Array<Record<string, unknown>>) =>
  incomeSources.reduce((sum, row) => sum + numberValue(row.monthly_amount), 0);

export const totalExpenses = (expenseProfile: Record<string, unknown> | null) => {
  if (!expenseProfile) return 0;
  return (
    numberValue(expenseProfile.housing) +
    numberValue(expenseProfile.utilities) +
    numberValue(expenseProfile.transport) +
    numberValue(expenseProfile.groceries) +
    numberValue(expenseProfile.insurance) +
    numberValue(expenseProfile.childcare) +
    numberValue(expenseProfile.discretionary) +
    numberValue(expenseProfile.other)
  );
};

export const debtTotal = (debts: Array<Record<string, unknown>>) => debts.reduce((sum, row) => sum + numberValue(row.balance), 0);

export const monthlySurplus = (income: number, expenses: number, debtPayments = 0) => income - expenses - debtPayments;

export const emergencyFundMonths = (savingsProfile: Record<string, unknown> | null, expenses: number) => {
  if (!savingsProfile || expenses <= 0) return 0;
  const emergencyFund = numberValue(savingsProfile.emergency_fund);
  return emergencyFund / expenses;
};

export const housingEquity = (housingProfile: Record<string, unknown> | null) => {
  if (!housingProfile) return 0;
  return numberValue(housingProfile.estimated_home_value) - numberValue(housingProfile.mortgage_balance);
};

export const monthlyDebtPayments = (debts: Array<Record<string, unknown>>) =>
  debts.reduce((sum, row) => sum + numberValue(row.monthly_payment), 0);

export const toCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
