import { DebtItem, FinanceData, ScenarioAdjustments } from "@/types";

const creditScoreMap = {
  "300-579": 25,
  "580-669": 50,
  "670-739": 70,
  "740-799": 85,
  "800-850": 95
} as const;

export const totalDebtBalance = (debts: DebtItem[]) => debts.reduce((sum, debt) => sum + debt.balance, 0);
export const totalDebtPayment = (debts: DebtItem[]) => debts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
export const totalIncome = (data: FinanceData) => data.monthlyIncome + data.otherIncome + data.estimatedRoomRentalIncome;

export const monthlyCashFlow = (data: FinanceData) =>
  totalIncome(data) - data.monthlyExpenses - totalDebtPayment(data.debts) - (data.housingStatus === "homeowner" ? data.mortgagePayment : data.rentAmount);

export const debtPressureIndex = (data: FinanceData) => {
  const income = Math.max(totalIncome(data), 1);
  return Math.min(100, Math.round((totalDebtPayment(data.debts) / income) * 100 + data.debts.length * 3));
};

export const homeReadinessScore = (data: FinanceData) => {
  const income = Math.max(totalIncome(data), 1);
  const housingRatio = ((data.housingStatus === "homeowner" ? data.mortgagePayment : data.rentAmount) / income) * 100;
  const savingsMonths = data.monthlyExpenses > 0 ? data.savings / data.monthlyExpenses : 0;
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(creditScoreMap[data.creditScoreRange] * 0.4 + (100 - housingRatio) * 0.35 + Math.min(100, savingsMonths * 18) * 0.25)
    )
  );
};

export const clarityScore = (data: FinanceData) => {
  const cash = monthlyCashFlow(data);
  const cashScore = Math.max(0, Math.min(100, 50 + cash / 60));
  return Math.round(cashScore * 0.4 + (100 - debtPressureIndex(data)) * 0.3 + homeReadinessScore(data) * 0.3);
};

export const mortgageAffordability = (data: FinanceData) => {
  const maxDti = 0.43;
  const income = totalIncome(data);
  const maxHousingPayment = Math.max(0, income * maxDti - totalDebtPayment(data.debts));
  const estimatedRate = 0.0675 / 12;
  const n = 360;
  const loanAmount = estimatedRate === 0 ? maxHousingPayment * n : (maxHousingPayment * (1 - Math.pow(1 + estimatedRate, -n))) / estimatedRate;
  return {
    maxHousingPayment,
    lowHomePrice: loanAmount * 0.9,
    highHomePrice: loanAmount * 1.1
  };
};

export const refinanceComparison = (balance: number, currentRate: number, newRate: number, yearsLeft: number, closingCosts: number) => {
  const n = yearsLeft * 12;
  const pmt = (principal: number, annualRate: number) => {
    const r = annualRate / 100 / 12;
    if (!principal || !n) return 0;
    return r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
  };

  const currentPayment = pmt(balance, currentRate);
  const newPayment = pmt(balance, newRate);
  const monthlySavings = currentPayment - newPayment;

  return {
    currentPayment,
    newPayment,
    monthlySavings,
    breakEvenMonths: monthlySavings > 0 ? Math.ceil(closingCosts / monthlySavings) : null
  };
};

export const debtPayoffEstimateMonths = (debts: DebtItem[]) => {
  const balance = totalDebtBalance(debts);
  const payment = totalDebtPayment(debts);
  const weightedApr = balance > 0 ? debts.reduce((sum, d) => sum + d.balance * d.interestRate, 0) / balance : 0;
  const monthlyRate = weightedApr / 100 / 12;

  if (balance === 0 || payment <= 0) return 0;
  if (monthlyRate === 0) return Math.ceil(balance / payment);
  if (payment <= balance * monthlyRate) return Infinity;

  return Math.ceil(Math.log(payment / (payment - balance * monthlyRate)) / Math.log(1 + monthlyRate));
};

export const applyScenario = (data: FinanceData, changes: ScenarioAdjustments): FinanceData => {
  const debtCount = Math.max(1, data.debts.length);
  return {
    ...data,
    monthlyIncome: data.monthlyIncome + changes.incomeIncrease,
    monthlyExpenses: Math.max(0, data.monthlyExpenses - changes.expenseReduction),
    mortgageRate: Math.max(0, data.mortgageRate - changes.lowerMortgageRateBy),
    estimatedRoomRentalIncome: data.estimatedRoomRentalIncome + changes.addRoomRentalIncome,
    debts: data.debts.map((debt) => ({
      ...debt,
      balance: Math.max(0, debt.balance - changes.debtPayoffAmount / debtCount)
    }))
  };
};

export function generateActionPlan(data: FinanceData) {
  const highestInterestDebt = [...data.debts].sort((a, b) => b.interestRate - a.interestRate)[0];
  const expenseReductionTarget = Math.round(data.monthlyExpenses * 0.08);
  const monthlySaveTarget = Math.max(100, Math.round(totalIncome(data) * 0.1));

  return {
    shortTerm: [
      `Reduce spending by about $${expenseReductionTarget}/month by trimming discretionary categories.`,
      highestInterestDebt ? `Pay extra toward ${highestInterestDebt.name} first (highest APR at ${highestInterestDebt.interestRate}%).` : "Add at least one debt account to track your payoff plan.",
      `Automate $${monthlySaveTarget}/month into savings.`
    ],
    midTerm: [
      "Improve debt-to-income ratio below 36% before major financing moves.",
      data.estimatedRoomRentalIncome > 0 ? "Validate room rental demand and keep vacancy buffer in your plan." : "Test a room-rental strategy to increase monthly cushion.",
      "Review credit usage and keep revolving utilization below 30%."
    ],
    longTerm: [
      "Build and maintain 3–6 months of essential expenses in emergency savings.",
      "Re-check mortgage/refinance options once rates improve or credit rises.",
      "Revisit your Clarity plan quarterly and update targets as income changes."
    ]
  };
}
