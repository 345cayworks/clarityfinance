export type DebtItem = { balance: number; interestRate: number; monthlyPayment: number; name: string; type: string };

export function totalIncome(incomes: Array<{ monthlyAmount: number }>): number {
  return incomes.reduce((sum, i) => sum + (i.monthlyAmount || 0), 0);
}

export function totalExpenses(expense: { housing: number; utilities: number; transport: number; groceries: number; insurance: number; childcare: number; discretionary: number; other: number } | null): number {
  if (!expense) return 0;
  return expense.housing + expense.utilities + expense.transport + expense.groceries + expense.insurance + expense.childcare + expense.discretionary + expense.other;
}

export function monthlyCashFlow(income: number, expenses: number, debtPayments: number): number {
  return income - expenses - debtPayments;
}

export function debtToIncomeRatio(totalDebtPayments: number, income: number): number {
  if (income <= 0) return 1;
  return totalDebtPayments / income;
}

export function savingsRunway(totalSavings: number, monthlyBurn: number): number {
  if (monthlyBurn <= 0) return 24;
  return totalSavings / monthlyBurn;
}

export function financialStabilityScore(cashFlow: number, dti: number, runwayMonths: number): number {
  const cashScore = Math.max(0, Math.min(40, 20 + cashFlow / 100));
  const dtiScore = Math.max(0, Math.min(35, (1 - dti) * 35));
  const runwayScore = Math.max(0, Math.min(25, runwayMonths * 2.5));
  return Math.round(cashScore + dtiScore + runwayScore);
}

export function homeReadinessScore(input: { downPaymentSavings: number; targetHomePrice?: number | null; dti: number; creditScore?: number | null; isUnitedStates: boolean; }): number {
  const target = input.targetHomePrice && input.targetHomePrice > 0 ? input.targetHomePrice : 350000;
  const downPaymentRatio = input.downPaymentSavings / (target * 0.2);
  const downPaymentScore = Math.max(0, Math.min(45, downPaymentRatio * 45));
  const dtiScore = Math.max(0, Math.min(35, (1 - input.dti) * 35));
  const creditScore = input.isUnitedStates ? Math.max(0, Math.min(20, ((input.creditScore ?? 680) - 580) / 7)) : 20;
  return Math.round(downPaymentScore + dtiScore + creditScore);
}

export function clarityScore(financialStability: number, homeReadiness: number, profileCompletion: number): number {
  return Math.round(financialStability * 0.5 + homeReadiness * 0.3 + profileCompletion * 0.2);
}

export function mortgageAffordability(input: { monthlyIncome: number; monthlyDebts: number; rate: number; years: number; }): { affordablePayment: number; affordableHomePrice: number; assumptions: string[] } {
  const affordablePayment = Math.max(0, input.monthlyIncome * 0.28 - input.monthlyDebts);
  const monthlyRate = input.rate / 100 / 12;
  const n = input.years * 12;
  const principal = monthlyRate === 0 ? affordablePayment * n : affordablePayment * ((1 - Math.pow(1 + monthlyRate, -n)) / monthlyRate);
  return {
    affordablePayment: Math.round(affordablePayment),
    affordableHomePrice: Math.round(principal / 0.8),
    assumptions: ["28% front-end ratio", `${input.years}-year fixed term`, "20% down payment estimate"]
  };
}

export function refinanceComparison(input: { currentBalance: number; currentRate: number; newRate: number; yearsLeft: number; closingCosts?: number; }) {
  const currentPayment = loanPayment(input.currentBalance, input.currentRate, input.yearsLeft);
  const newPayment = loanPayment(input.currentBalance, input.newRate, input.yearsLeft);
  const monthlySavings = currentPayment - newPayment;
  const breakEvenMonths = input.closingCosts && monthlySavings > 0 ? input.closingCosts / monthlySavings : null;
  return { currentPayment, newPayment, monthlySavings, breakEvenMonths };
}

export function rentRoomImpact(cashFlow: number, roomIncome: number): { newCashFlow: number; improvement: number } {
  return { newCashFlow: cashFlow + roomIncome, improvement: roomIncome };
}

export function debtPayoffEstimates(debts: DebtItem[]) {
  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
  const payment = debts.reduce((sum, d) => sum + d.monthlyPayment, 0);
  const months = payment > 0 ? totalDebt / payment : 0;
  return {
    totalDebt,
    estimatedMonths: Math.ceil(months),
    snowballNote: "Snowball targets smallest balances first for momentum.",
    avalancheNote: "Avalanche targets highest rates first to minimize interest."
  };
}

export function scenarioComparison(base: number, updated: number): { delta: number; percent: number } {
  const delta = updated - base;
  const percent = base === 0 ? 0 : (delta / base) * 100;
  return { delta, percent };
}

function loanPayment(principal: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const n = years * 12;
  if (monthlyRate === 0) return principal / n;
  return principal * ((monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1));
}
