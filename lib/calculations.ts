import { DebtItem, FinanceData, ScenarioAdjustments } from "@/types";

const creditScoreMap = {
  "300-579": 25,
  "580-669": 50,
  "670-739": 70,
  "740-799": 85,
  "800-850": 95,
  not_provided: 60
} as const;

const employmentStabilityMap = {
  full_time: 90,
  part_time: 70,
  self_employed: 72,
  contract: 66,
  retired: 68,
  unemployed: 35
} as const;

export const isUSMarket = (data: FinanceData) => data.countryOrMarket === "United States";
export const totalDebtBalance = (debts: DebtItem[]) => debts.reduce((sum, debt) => sum + debt.balance, 0);
export const totalDebtPayment = (debts: DebtItem[]) => debts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
export const totalIncome = (data: FinanceData) => data.monthlyIncome + data.otherIncome + data.estimatedRoomRentalIncome;
export const housingCost = (data: FinanceData) => data.monthlyHousingCost || (data.housingStatus === "homeowner" ? data.mortgagePayment : data.rentAmount);

export const monthlyCashFlow = (data: FinanceData) => totalIncome(data) - data.monthlyExpenses - totalDebtPayment(data.debts) - housingCost(data);

export const savingsRunwayMonths = (data: FinanceData) => {
  const burn = data.monthlyExpenses + housingCost(data) + totalDebtPayment(data.debts);
  if (burn <= 0) return 24;
  return data.savings / burn;
};

export const debtPressureIndex = (data: FinanceData) => {
  const income = Math.max(totalIncome(data), 1);
  return Math.min(100, Math.round((totalDebtPayment(data.debts) / income) * 100 + data.debts.length * 3 + data.dependents * 1.5));
};

export const financialStabilityScore = (data: FinanceData) => {
  const cash = monthlyCashFlow(data);
  const runway = savingsRunwayMonths(data);
  const cashScore = Math.max(0, Math.min(100, 50 + cash / 55));
  const runwayScore = Math.max(0, Math.min(100, runway * 20));
  const debtScore = 100 - debtPressureIndex(data);
  const jobScore = employmentStabilityMap[data.employmentType];

  return Math.round(cashScore * 0.35 + runwayScore * 0.25 + debtScore * 0.25 + jobScore * 0.15);
};

export const homeReadinessScore = (data: FinanceData) => {
  const income = Math.max(totalIncome(data), 1);
  const dti = (totalDebtPayment(data.debts) + housingCost(data)) / income;
  const runway = Math.min(100, savingsRunwayMonths(data) * 18);
  const cashFlowStrength = Math.max(0, Math.min(100, 50 + monthlyCashFlow(data) / 65));

  if (isUSMarket(data)) {
    return Math.max(0, Math.min(100, Math.round((1 - dti) * 100 * 0.4 + creditScoreMap[data.creditScoreRange] * 0.35 + runway * 0.25)));
  }

  return Math.max(0, Math.min(100, Math.round((1 - dti) * 100 * 0.35 + cashFlowStrength * 0.3 + runway * 0.2 + financialStabilityScore(data) * 0.15)));
};

export const clarityScore = (data: FinanceData) => {
  const cash = monthlyCashFlow(data);
  const cashScore = Math.max(0, Math.min(100, 50 + cash / 60));
  return Math.round(cashScore * 0.35 + (100 - debtPressureIndex(data)) * 0.2 + homeReadinessScore(data) * 0.25 + financialStabilityScore(data) * 0.2);
};

export const mortgageAffordability = (data: FinanceData) => {
  const income = totalIncome(data);
  const debtPayments = totalDebtPayment(data.debts);

  const maxDti = isUSMarket(data)
    ? data.creditScoreRange === "300-579"
      ? 0.36
      : data.creditScoreRange === "740-799" || data.creditScoreRange === "800-850"
        ? 0.45
        : 0.43
    : 0.35;

  const maxHousingPayment = Math.max(0, income * maxDti - debtPayments);
  const estimatedRate = (isUSMarket(data) ? 0.0675 : 0.085) / 12;
  const n = 360;
  const loanAmount = estimatedRate === 0 ? maxHousingPayment * n : (maxHousingPayment * (1 - Math.pow(1 + estimatedRate, -n))) / estimatedRate;

  return {
    mode: isUSMarket(data) ? "us_dti" : "international_stability",
    maxHousingPayment,
    lowHomePrice: loanAmount * 0.88,
    highHomePrice: loanAmount * 1.08
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
  const nextExpenses = Math.max(0, data.monthlyExpenses - changes.expenseReduction);
  const nextHousing = Math.max(0, housingCost(data) - changes.lowerHousingCost);
  const baseSavingsContribution = Math.max(0, nextExpenses * (changes.savingsRateBoost / 100));

  return {
    ...data,
    monthlyIncome: data.monthlyIncome + changes.incomeIncrease,
    monthlyExpenses: nextExpenses,
    mortgageRate: Math.max(0, data.mortgageRate - changes.lowerMortgageRateBy),
    monthlyHousingCost: nextHousing,
    savings: data.savings + baseSavingsContribution,
    estimatedRoomRentalIncome: data.estimatedRoomRentalIncome + changes.addRoomRentalIncome,
    debts: data.debts.map((debt) => ({
      ...debt,
      balance: Math.max(0, debt.balance - changes.debtPayoffAmount / debtCount)
    }))
  };
};

export function generateActionPlan(data: FinanceData) {
  const highestInterestDebt = [...data.debts].sort((a, b) => b.interestRate - a.interestRate)[0];
  const runway = savingsRunwayMonths(data);
  const debtPressure = debtPressureIndex(data);
  const roomRentalPossible = data.housingStatus === "homeowner" || data.housingStatus === "renting";
  const expenseReductionTarget = Math.round(data.monthlyExpenses * 0.08);
  const monthlySaveTarget = Math.max(100, Math.round(totalIncome(data) * 0.1));

  const regionalGuidance = isUSMarket(data)
    ? "Improve affordability before mortgage application by targeting DTI under 36%."
    : "Build strong affordability evidence with steady surplus, lower debt pressure, and consistent savings history.";

  return {
    shortTerm: [
      `Increase monthly surplus by reducing expenses by about ${expenseReductionTarget} in your preferred currency.`,
      highestInterestDebt ? `Prioritize ${highestInterestDebt.name} first (highest APR at ${highestInterestDebt.interestRate}%).` : "Add at least one debt account to track your payoff plan.",
      runway < 3 ? "Grow emergency fund toward at least 3 months of essential costs." : `Automate at least ${monthlySaveTarget}/month toward savings growth.`
    ],
    midTerm: [
      regionalGuidance,
      roomRentalPossible ? (data.estimatedRoomRentalIncome > 0 ? "Test a conservative vacancy buffer for your rent-a-room income plan." : "Explore a rent-a-room strategy if local rules and lease terms allow.") : "Focus on non-rental income growth strategies.",
      debtPressure > 45 ? "Reduce high-interest debt to lower monthly pressure before major financing." : "Keep debt pressure low and avoid adding new revolving balances."
    ],
    longTerm: [
      data.targetGoal === "buy_home" ? "Strengthen down-payment and closing-cost reserves before beginning lender pre-approval." : "Reassess long-term goal timing quarterly as your cash flow improves.",
      "Revisit your plan quarterly and update assumptions as income, rates, or housing costs shift.",
      `Align strategy to ${data.countryOrMarket} lending norms and documentation requirements.`
    ]
  };
}
