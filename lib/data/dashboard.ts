import { prisma } from "@/lib/db/prisma";
import {
  clarityScore,
  debtPayoffEstimates,
  debtToIncomeRatio,
  financialStabilityScore,
  homeReadinessScore,
  monthlyCashFlow,
  savingsRunway,
  totalExpenses,
  totalIncome
} from "@/lib/calculations/finance";

export async function getUserFinanceSummary(userId: string) {
  const [profile, incomes, expense, debts, housing, savings, goal, actionPlans] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.incomeSource.findMany({ where: { userId } }),
    prisma.expenseProfile.findUnique({ where: { userId } }),
    prisma.debt.findMany({ where: { userId } }),
    prisma.housingProfile.findUnique({ where: { userId } }),
    prisma.savingsProfile.findUnique({ where: { userId } }),
    prisma.goal.findUnique({ where: { userId } }),
    prisma.actionPlan.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 1 })
  ]);

  const income = totalIncome(incomes);
  const expenses = totalExpenses(expense);
  const debtPayments = debts.reduce((sum, d) => sum + d.monthlyPayment, 0);
  const cashFlow = monthlyCashFlow(income, expenses, debtPayments);
  const dti = debtToIncomeRatio(debtPayments, income);
  const totalSavings = (savings?.cashSavings ?? 0) + (savings?.emergencyFund ?? 0) + (savings?.investments ?? 0) + (savings?.retirementSavings ?? 0);
  const runway = savingsRunway(totalSavings, Math.max(0, expenses + debtPayments - income));
  const stability = financialStabilityScore(cashFlow, dti, runway);
  const homeReadiness = homeReadinessScore({
    downPaymentSavings: savings?.downPaymentSavings ?? 0,
    targetHomePrice: goal?.targetHomePrice,
    dti,
    creditScore: Number(profile?.creditScoreOrProfile ?? 0) || null,
    isUnitedStates: profile?.countryOrMarket === "United States"
  });

  const completionFields = [profile, incomes.length > 0, expense, debts.length > 0, housing, savings, goal];
  const completion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);

  const clarity = clarityScore(stability, homeReadiness, completion);
  const debtPlan = debtPayoffEstimates(debts.map((d) => ({ ...d })));

  return {
    profile,
    incomes,
    expense,
    debts,
    housing,
    savings,
    goal,
    actionPlan: actionPlans[0] ?? null,
    metrics: {
      clarity,
      stability,
      cashFlow,
      dti,
      homeReadiness,
      runway,
      completion,
      debtPressure: Math.round(dti * 100),
      topInsight: cashFlow < 0 ? "Your cash flow is negative. Prioritize expense and debt optimization." : "Your positive cash flow can be allocated to goals faster.",
      nextStep: completion < 100 ? "Complete onboarding profile to improve plan accuracy." : "Run a scenario and lock your next 30-day action plan.",
      totalIncome: income,
      totalExpenses: expenses,
      totalDebt: debtPlan.totalDebt,
      debtTimelineMonths: debtPlan.estimatedMonths
    }
  };
}
