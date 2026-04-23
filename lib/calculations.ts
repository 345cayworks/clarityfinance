import { Debt, FinancialProfile, PlanStep, ScenarioInput } from "@/types";

const scoreMap: Record<FinancialProfile["creditScoreRange"], number> = {
  "300-579": 20,
  "580-669": 45,
  "670-739": 65,
  "740-799": 82,
  "800-850": 95
};

export const totalDebtPayment = (debts: Debt[]) => debts.reduce((sum, d) => sum + d.monthlyPayment, 0);
export const totalDebtBalance = (debts: Debt[]) => debts.reduce((sum, d) => sum + d.balance, 0);

export const monthlyCashFlow = (profile: FinancialProfile, debts: Debt[]) =>
  profile.monthlyIncome - profile.monthlyExpenses - totalDebtPayment(debts);

export const debtToIncomeRatio = (profile: FinancialProfile, debts: Debt[]) => {
  if (!profile.monthlyIncome) return 0;
  return ((profile.monthlyExpenses + totalDebtPayment(debts)) / profile.monthlyIncome) * 100;
};

export const debtPressureIndex = (profile: FinancialProfile, debts: Debt[]) => {
  const dti = debtToIncomeRatio(profile, debts);
  const pressure = Math.min(100, dti + debts.length * 4);
  return Math.round(pressure);
};

export const homeReadinessScore = (profile: FinancialProfile, debts: Debt[]) => {
  const dtiScore = Math.max(0, 100 - debtToIncomeRatio(profile, debts));
  const savingsMonths = profile.monthlyExpenses ? profile.savings / profile.monthlyExpenses : 0;
  const savingsScore = Math.min(100, savingsMonths * 20);

  return Math.round(scoreMap[profile.creditScoreRange] * 0.45 + dtiScore * 0.35 + savingsScore * 0.2);
};

export const clarityScore = (profile: FinancialProfile, debts: Debt[]) => {
  const cash = monthlyCashFlow(profile, debts);
  const cashScore = Math.max(0, Math.min(100, 50 + cash / 100));
  const debtScore = 100 - debtPressureIndex(profile, debts);
  const readiness = homeReadinessScore(profile, debts);
  return Math.round(cashScore * 0.35 + debtScore * 0.25 + readiness * 0.4);
};

export const mortgageAffordability = (profile: FinancialProfile, debts: Debt[]) => {
  const maxDti = 0.43;
  const availableMonthly = profile.monthlyIncome * maxDti - totalDebtPayment(debts);
  const annualBudget = Math.max(0, availableMonthly) * 12;
  return {
    maxMonthlyHousing: Math.max(0, availableMonthly),
    estimatedHomePrice: annualBudget * 3.6
  };
};

export const refinanceComparison = (balance: number, currentRate: number, newRate: number, yearsLeft: number) => {
  const r1 = currentRate / 100 / 12;
  const r2 = newRate / 100 / 12;
  const n = yearsLeft * 12;
  const currentPayment = r1 === 0 ? balance / n : (balance * r1) / (1 - Math.pow(1 + r1, -n));
  const newPayment = r2 === 0 ? balance / n : (balance * r2) / (1 - Math.pow(1 + r2, -n));

  return {
    currentPayment,
    newPayment,
    monthlySavings: currentPayment - newPayment
  };
};

export const debtPayoffMonths = (debts: Debt[]) => {
  const weightedRate = debts.length
    ? debts.reduce((sum, d) => sum + d.interestRate * d.balance, 0) / Math.max(1, totalDebtBalance(debts))
    : 0;
  const monthlyRate = weightedRate / 100 / 12;
  const payment = totalDebtPayment(debts);
  const balance = totalDebtBalance(debts);

  if (!balance || !payment || payment <= balance * monthlyRate) return 0;
  return Math.ceil(Math.log(payment / (payment - balance * monthlyRate)) / Math.log(1 + monthlyRate));
};

export const applyScenario = (profile: FinancialProfile, debts: Debt[], scenario: ScenarioInput) => {
  const updatedDebts = debts.map((debt) => ({
    ...debt,
    balance: Math.max(0, debt.balance - scenario.debtReduction / Math.max(1, debts.length)),
    interestRate: Math.max(0, debt.interestRate - scenario.interestRateReduction)
  }));

  const updatedProfile: FinancialProfile = {
    ...profile,
    monthlyIncome: profile.monthlyIncome + scenario.incomeDelta + scenario.rentalIncome
  };

  return {
    profile: updatedProfile,
    debts: updatedDebts
  };
};

export const generateActionPlan = (profile: FinancialProfile, debts: Debt[]): Record<string, PlanStep[]> => {
  const cash = monthlyCashFlow(profile, debts);
  const dti = debtToIncomeRatio(profile, debts);

  return {
    "30-day": [
      { title: "Track spending", detail: "Categorize the last 60 days and cut one non-essential category by 10%." },
      { title: "Automate savings", detail: `Move ${Math.max(50, Math.round(profile.monthlyIncome * 0.05))}/month to emergency savings.` },
      { title: "Debt review", detail: "List each debt APR and request hardship or rate reductions where possible." }
    ],
    "90-day": [
      { title: "Raise net cash flow", detail: `Target a monthly cash flow above ${Math.max(300, cash + 200).toFixed(0)}.` },
      { title: "Lower DTI", detail: `Aim to reduce DTI from ${dti.toFixed(1)}% to below ${Math.max(30, dti - 5).toFixed(1)}%.` },
      { title: "Credit optimization", detail: "Keep utilization under 30% and ensure all payments post on time." }
    ],
    "12-month": [
      { title: "Emergency fund milestone", detail: "Build 3-6 months of essential expenses in reserves." },
      { title: "Debt reduction milestone", detail: "Allocate raises/bonuses to principal reduction for highest APR debt." },
      { title: "Home readiness prep", detail: "Recheck affordability, improve credit, and build down payment runway." }
    ]
  };
};
