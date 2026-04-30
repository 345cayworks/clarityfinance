export {
  numberValue as toNumber,
  getMonthlyIncome,
  getHousingExpense,
  getNonHousingLivingExpenses,
  getTotalLivingExpenses,
  getMonthlyDebtPayments,
  getTotalMonthlyObligations,
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
} from "@/lib/calculations/finance";

import { numberValue, getMonthlyDebtPayments, getTotalDebt, getSavingsRunwayMonths, formatMoney } from "@/lib/calculations/finance";

export const totalIncome = (incomeSources: Array<Record<string, unknown>>) => incomeSources.reduce((sum, row) => sum + numberValue(row.monthly_amount), 0);
export const totalNonHousingExpenses = (expenseProfile: Record<string, unknown> | null) => ["utilities","transport","groceries","insurance","childcare","discretionary","other"].reduce((s,k)=>s+numberValue(expenseProfile?.[k]),0);
export const totalExpenses = totalNonHousingExpenses;
export const housingPayment = (housingProfile: Record<string, unknown> | null) => {
  const m = numberValue(housingProfile?.mortgage_payment);
  if (m > 0) return m;
  const r = numberValue(housingProfile?.rent_amount);
  return r > 0 ? r : 0;
};
export const totalLivingExpenses = (expenseProfile: Record<string, unknown> | null, housingProfile: Record<string, unknown> | null) => totalNonHousingExpenses(expenseProfile)+housingPayment(housingProfile);
export const debtTotal = (debts: Array<Record<string, unknown>>, housingProfile: Record<string, unknown> | null = null) => getTotalDebt(debts, housingProfile);
export const monthlyDebtPayments = (debts: Array<Record<string, unknown>>) => getMonthlyDebtPayments(debts);
export const totalMonthlyObligations = (expenseProfile: Record<string, unknown> | null, housingProfile: Record<string, unknown> | null, debts: Array<Record<string, unknown>>) => totalLivingExpenses(expenseProfile, housingProfile)+monthlyDebtPayments(debts);
export const monthlySurplus = (incomeSources: Array<Record<string, unknown>>, expenseProfile: Record<string, unknown> | null, housingProfile: Record<string, unknown> | null, debts: Array<Record<string, unknown>> = []) => totalIncome(incomeSources)-totalMonthlyObligations(expenseProfile,housingProfile,debts);
export const savingsRunwayMonths = (savingsProfile: Record<string, unknown> | null, expenseProfile: Record<string, unknown> | null, housingProfile: Record<string, unknown> | null = null) => getSavingsRunwayMonths(savingsProfile, expenseProfile, housingProfile);
export const emergencyFundMonths = (
  savingsProfile: Record<string, unknown> | null,
  totalLivingExpensesAmount: number
) => {
  if (!savingsProfile || totalLivingExpensesAmount <= 0) return 0;
  const emergencyFund = numberValue(savingsProfile.emergency_fund ?? savingsProfile.emergencyFund);
  return emergencyFund / totalLivingExpensesAmount;
};

export const housingEquity = (housingProfile: Record<string, unknown> | null) => numberValue(housingProfile?.estimated_home_value)-numberValue(housingProfile?.mortgage_balance);
export const monthlyCashFlow = (income:number, expenses:number, debtPayments:number) => income-expenses-debtPayments;
export const debtToIncomeRatio = (totalDebtPayments:number, income:number) => income<=0 ? 0 : totalDebtPayments/income;
export const financialStabilityScore = (cashFlow:number,dti:number,runwayMonths:number)=>Math.round(Math.max(0,Math.min(40,20+cashFlow/100))+Math.max(0,Math.min(35,(1-dti)*35))+Math.max(0,Math.min(25,runwayMonths*2.5)));
export const homeReadinessScore = (input: Record<string, unknown>): number => {
  const target = numberValue(input.targetHomePrice) > 0 ? numberValue(input.targetHomePrice) : 350000;
  const downPaymentSavings = numberValue(input.downPaymentSavings);
  const downPaymentScore = Math.max(0, Math.min(45, (downPaymentSavings / (target * 0.2)) * 45));
  const dtiScore = Math.max(0, Math.min(35, (1 - numberValue(input.dti)) * 35));
  const isUnitedStates = Boolean(input.isUnitedStates);
  const creditScore = isUnitedStates ? Math.max(0, Math.min(20, (numberValue(input.creditScore ?? 680) - 580) / 7)) : 20;
  return Math.round(downPaymentScore + dtiScore + creditScore);
};
export const clarityScore = (a:number,b:number,c:number)=>Math.round(a*0.5+b*0.3+c*0.2);
export const debtPayoffEstimates = (debts: Array<Record<string, unknown>>) => { const totalDebt=getTotalDebt(debts); const payment=debts.reduce((s,d)=>s+numberValue(d.monthlyPayment??d.monthly_payment),0); const months=payment>0?totalDebt/payment:0; return { totalDebt, estimatedMonths: Math.ceil(months), snowballNote:"Snowball targets smallest balances first for momentum.", avalancheNote:"Avalanche targets highest rates first to minimize interest." };};
export const rentRoomImpact=(cashFlow:number,roomIncome:number)=>({newCashFlow:cashFlow+roomIncome, improvement:roomIncome});
