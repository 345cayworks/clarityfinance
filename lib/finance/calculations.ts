import {
  type GenericRow,
  numberValue,
  getMonthlyIncome,
  getHousingExpense,
  getNonHousingNonDebtExpenses,
  getMonthlyDebtPayments,
  getTotalMonthlyExpenses,
  getMonthlySurplus,
  getDebtToIncomeRatio,
  getHousingRatio,
  getTotalObligationRatio,
  getTotalDebt,
  getAssets,
  getLiabilities,
  getNetWorth,
  getSavingsRunwayMonths,
  formatMoney,
  formatPercent
} from "@/lib/calculations/finance";

export const getNonHousingLivingExpenses = getNonHousingNonDebtExpenses;

export const getTotalLivingExpenses = (
  expenseProfile: GenericRow | null,
  housingProfile: GenericRow | null,
  debts: GenericRow[] = []
): number => getTotalMonthlyExpenses(expenseProfile, housingProfile, debts);

export const totalIncome = (incomeSources: GenericRow[] = [], profile: GenericRow | null = null): number =>
  getMonthlyIncome(profile, incomeSources).value;

export const totalExpenses = (expenseProfile: GenericRow | null): number => getNonHousingNonDebtExpenses(expenseProfile).value;

export const housingPayment = (housingProfile: GenericRow | null): number => getHousingExpense(housingProfile).value;

export const monthlyDebtPayments = (debts: GenericRow[] = []): number => getMonthlyDebtPayments(debts);

export const monthlySurplus = (
  incomeSources: GenericRow[] = [],
  expenseProfile: GenericRow | null,
  housingProfile: GenericRow | null,
  debts: GenericRow[] = [],
  profile: GenericRow | null = null
): number => getMonthlySurplus(profile, incomeSources, expenseProfile, housingProfile, debts);

export const emergencyFundMonths = (savingsProfile: GenericRow | null, monthlyExpenses: number): number => {
  if (monthlyExpenses <= 0) return 0;
  return (numberValue(savingsProfile?.cash_savings) + numberValue(savingsProfile?.emergency_fund)) / monthlyExpenses;
};

export const savingsRunwayMonths = (
  savingsProfile: GenericRow | null,
  expenseProfile: GenericRow | null,
  housingProfile: GenericRow | null
): number | null => {
  const value = getSavingsRunwayMonths(savingsProfile, expenseProfile, housingProfile);
  return Number.isFinite(value) ? value : null;
};

export const housingEquity = (housingProfile: GenericRow | null): number =>
  numberValue(housingProfile?.estimated_home_value) - numberValue(housingProfile?.mortgage_balance);

export const debtToIncomeRatio = (monthlyDebt: number, monthlyIncomeAmount: number): number =>
  monthlyIncomeAmount > 0 ? monthlyDebt / monthlyIncomeAmount : 0;

export const financialStabilityScore = (surplus: number, dti: number, runwayMonths: number): number => {
  const surplusScore = Math.max(0, Math.min(40, surplus / 100));
  const dtiScore = Math.max(0, Math.min(35, (1 - Math.min(Math.max(dti, 0), 1)) * 35));
  const runwayScore = Math.max(0, Math.min(25, runwayMonths * 4));
  return Math.round(surplusScore + dtiScore + runwayScore);
};

export const homeReadinessScore = (input: {
  downPaymentSavings: number;
  targetHomePrice: number;
  dti: number;
  creditScore: number | null;
  isUnitedStates: boolean;
}): number => {
  const downPaymentRatio = input.targetHomePrice > 0 ? input.downPaymentSavings / input.targetHomePrice : 0;
  const downPaymentScore = Math.max(0, Math.min(40, downPaymentRatio * 200));
  const dtiScore = Math.max(0, Math.min(30, (1 - Math.min(Math.max(input.dti, 0), 1)) * 30));
  const creditBase = input.creditScore ?? (input.isUnitedStates ? 620 : 650);
  const creditScore = Math.max(0, Math.min(30, ((creditBase - 300) / 550) * 30));
  return Math.round(downPaymentScore + dtiScore + creditScore);
};

export const clarityScore = (stability: number, readiness: number, completion: number): number =>
  Math.round(stability * 0.45 + readiness * 0.35 + Math.max(0, Math.min(100, completion)) * 0.2);

type DebtInput = {
  name?: string;
  type?: string;
  balance?: number;
  monthlyPayment?: number;
  interestRate?: number;
};

export const debtPayoffEstimates = (debts: DebtInput[]) => {
  const normalized = debts.map((debt) => ({
    name: debt.name ?? "Debt",
    balance: numberValue(debt.balance),
    monthlyPayment: numberValue(debt.monthlyPayment),
    interestRate: numberValue(debt.interestRate)
  }));
  const totalDebt = normalized.reduce((sum, debt) => sum + debt.balance, 0);
  const totalPayment = normalized.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
  const weightedApr = totalDebt > 0
    ? normalized.reduce((sum, debt) => sum + debt.balance * (debt.interestRate / 100), 0) / totalDebt
    : 0;
  const monthlyRate = weightedApr / 12;
  const monthlyInterest = totalDebt * monthlyRate;
  const estimatedMonths = totalPayment <= 0
    ? 0
    : monthlyRate > 0 && totalPayment <= monthlyInterest
      ? null
      : monthlyRate === 0
        ? Math.max(1, Math.ceil(totalDebt / totalPayment))
        : Math.max(1, Math.ceil(Math.log(totalPayment / (totalPayment - monthlyInterest)) / Math.log(1 + monthlyRate)));
  return {
    totalDebt,
    estimatedMonths,
    snowballNote: "Snowball: pay minimums, then direct extra payment to the smallest balance first.",
    avalancheNote: "Avalanche: pay minimums, then direct extra payment to the highest interest debt first."
  };
};

export const debtPayoffEstimate = debtPayoffEstimates;

export const rentRoomImpact = (currentMonthlySurplus: number, monthlyRentIncome: number, monthlyRoomCosts: number) => {
  const netImpact = numberValue(monthlyRentIncome) - numberValue(monthlyRoomCosts);
  return {
    netImpact,
    projectedSurplus: numberValue(currentMonthlySurplus) + netImpact
  };
};

export {
  numberValue as toNumber,
  getMonthlyIncome,
  getHousingExpense,
  getNonHousingNonDebtExpenses,
  getMonthlyDebtPayments,
  getTotalMonthlyExpenses,
  getMonthlySurplus,
  getDebtToIncomeRatio,
  getHousingRatio,
  getTotalObligationRatio,
  getTotalDebt,
  getAssets,
  getLiabilities,
  getNetWorth,
  getSavingsRunwayMonths,
  formatMoney as toCurrency,
  formatPercent
};
