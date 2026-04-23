import { getPrisma } from "@/lib/db/prisma";
import { defaultFinanceData } from "@/lib/storage";
import { FinanceData } from "@/types";

const prisma = getPrisma();

export async function getFinanceDataByUserId(userId: string): Promise<FinanceData> {
  const [profile, income, expense, housing, goal, debts] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.income.findUnique({ where: { userId } }),
    prisma.expense.findUnique({ where: { userId } }),
    prisma.housing.findUnique({ where: { userId } }),
    prisma.goal.findUnique({ where: { userId } }),
    prisma.debt.findMany({ where: { userId }, orderBy: { createdAt: "asc" } })
  ]);

  return {
    ...defaultFinanceData,
    countryOrMarket: profile?.countryOrMarket ?? defaultFinanceData.countryOrMarket,
    preferredCurrency: (profile?.preferredCurrency as FinanceData["preferredCurrency"]) ?? defaultFinanceData.preferredCurrency,
    ageRange: profile?.ageRange ?? defaultFinanceData.ageRange,
    employmentType: (profile?.employmentType as FinanceData["employmentType"]) ?? defaultFinanceData.employmentType,
    householdStatus: profile?.householdStatus ?? defaultFinanceData.householdStatus,
    dependents: profile?.dependents ?? defaultFinanceData.dependents,
    creditScoreKnown: profile?.creditScoreKnown ?? defaultFinanceData.creditScoreKnown,
    creditScoreRange: (profile?.creditScoreOrProfile as FinanceData["creditScoreRange"]) ?? defaultFinanceData.creditScoreRange,
    savings: profile?.savings ?? defaultFinanceData.savings,
    monthlyIncome: income?.monthlyIncome ?? defaultFinanceData.monthlyIncome,
    otherIncome: income?.otherIncome ?? defaultFinanceData.otherIncome,
    incomeFrequency: income?.incomeFrequency ?? defaultFinanceData.incomeFrequency,
    incomeStability: income?.incomeStability ?? defaultFinanceData.incomeStability,
    rentalIncome: income?.rentalIncome ?? defaultFinanceData.rentalIncome,
    sideIncome: income?.sideIncome ?? defaultFinanceData.sideIncome,
    monthlyExpenses: expense?.monthlyExpenses ?? defaultFinanceData.monthlyExpenses,
    monthlyHousingCost: expense?.monthlyHousingCost ?? defaultFinanceData.monthlyHousingCost,
    utilities: expense?.utilities ?? defaultFinanceData.utilities,
    transport: expense?.transport ?? defaultFinanceData.transport,
    groceries: expense?.groceries ?? defaultFinanceData.groceries,
    insurance: expense?.insurance ?? defaultFinanceData.insurance,
    childcare: expense?.childcare ?? defaultFinanceData.childcare,
    discretionarySpending: expense?.discretionarySpending ?? defaultFinanceData.discretionarySpending,
    housingStatus: (housing?.housingStatus as FinanceData["housingStatus"]) ?? defaultFinanceData.housingStatus,
    rentAmount: housing?.rentAmount ?? defaultFinanceData.rentAmount,
    mortgageBalance: housing?.mortgageBalance ?? defaultFinanceData.mortgageBalance,
    mortgageRate: housing?.mortgageRate ?? defaultFinanceData.mortgageRate,
    mortgagePayment: housing?.mortgagePayment ?? defaultFinanceData.mortgagePayment,
    estimatedHomeValue: housing?.estimatedHomeValue ?? defaultFinanceData.estimatedHomeValue,
    spareRoomAvailable: housing?.spareRoomAvailable ?? defaultFinanceData.spareRoomAvailable,
    estimatedRoomRentalIncome: housing?.estimatedRoomRentalIncome ?? defaultFinanceData.estimatedRoomRentalIncome,
    targetGoal: (goal?.targetGoal as FinanceData["targetGoal"]) ?? defaultFinanceData.targetGoal,
    targetHomePrice: goal?.targetHomePrice ?? defaultFinanceData.targetHomePrice,
    targetSavingsGoal: goal?.targetSavingsGoal ?? defaultFinanceData.targetSavingsGoal,
    targetDebtReduction: goal?.targetDebtReduction ?? defaultFinanceData.targetDebtReduction,
    targetMonthlyCashFlow: goal?.targetMonthlyCashFlow ?? defaultFinanceData.targetMonthlyCashFlow,
    goalTimeframe: goal?.goalTimeframe ?? defaultFinanceData.goalTimeframe,
    debts: debts.map((debt: { id: string; name: string; type: string; balance: number; interestRate: number; monthlyPayment: number }) => ({ id: debt.id, name: debt.name, type: debt.type, balance: debt.balance, interestRate: debt.interestRate, monthlyPayment: debt.monthlyPayment }))
  };
}

export async function upsertFinanceData(userId: string, data: FinanceData) {
  await prisma.$transaction([
    prisma.profile.upsert({ where: { userId }, update: { countryOrMarket: data.countryOrMarket, preferredCurrency: data.preferredCurrency, ageRange: data.ageRange, employmentType: data.employmentType, householdStatus: data.householdStatus, dependents: data.dependents, creditScoreKnown: data.creditScoreKnown, creditScoreOrProfile: data.creditScoreRange, savings: data.savings }, create: { userId, countryOrMarket: data.countryOrMarket, preferredCurrency: data.preferredCurrency, ageRange: data.ageRange, employmentType: data.employmentType, householdStatus: data.householdStatus, dependents: data.dependents, creditScoreKnown: data.creditScoreKnown, creditScoreOrProfile: data.creditScoreRange, savings: data.savings } }),
    prisma.income.upsert({ where: { userId }, update: { monthlyIncome: data.monthlyIncome, otherIncome: data.otherIncome, incomeFrequency: data.incomeFrequency, incomeStability: data.incomeStability, rentalIncome: data.rentalIncome, sideIncome: data.sideIncome }, create: { userId, monthlyIncome: data.monthlyIncome, otherIncome: data.otherIncome, incomeFrequency: data.incomeFrequency, incomeStability: data.incomeStability, rentalIncome: data.rentalIncome, sideIncome: data.sideIncome } }),
    prisma.expense.upsert({ where: { userId }, update: { monthlyExpenses: data.monthlyExpenses, monthlyHousingCost: data.monthlyHousingCost, utilities: data.utilities, transport: data.transport, groceries: data.groceries, insurance: data.insurance, childcare: data.childcare, discretionarySpending: data.discretionarySpending }, create: { userId, monthlyExpenses: data.monthlyExpenses, monthlyHousingCost: data.monthlyHousingCost, utilities: data.utilities, transport: data.transport, groceries: data.groceries, insurance: data.insurance, childcare: data.childcare, discretionarySpending: data.discretionarySpending } }),
    prisma.housing.upsert({ where: { userId }, update: { housingStatus: data.housingStatus, rentAmount: data.rentAmount, mortgageBalance: data.mortgageBalance, mortgageRate: data.mortgageRate, mortgagePayment: data.mortgagePayment, estimatedHomeValue: data.estimatedHomeValue, spareRoomAvailable: data.spareRoomAvailable, estimatedRoomRentalIncome: data.estimatedRoomRentalIncome }, create: { userId, housingStatus: data.housingStatus, rentAmount: data.rentAmount, mortgageBalance: data.mortgageBalance, mortgageRate: data.mortgageRate, mortgagePayment: data.mortgagePayment, estimatedHomeValue: data.estimatedHomeValue, spareRoomAvailable: data.spareRoomAvailable, estimatedRoomRentalIncome: data.estimatedRoomRentalIncome } }),
    prisma.goal.upsert({ where: { userId }, update: { targetGoal: data.targetGoal, targetHomePrice: data.targetHomePrice, targetSavingsGoal: data.targetSavingsGoal, targetDebtReduction: data.targetDebtReduction, targetMonthlyCashFlow: data.targetMonthlyCashFlow, goalTimeframe: data.goalTimeframe }, create: { userId, targetGoal: data.targetGoal, targetHomePrice: data.targetHomePrice, targetSavingsGoal: data.targetSavingsGoal, targetDebtReduction: data.targetDebtReduction, targetMonthlyCashFlow: data.targetMonthlyCashFlow, goalTimeframe: data.goalTimeframe } })
  ]);

  await prisma.debt.deleteMany({ where: { userId } });
  if (data.debts.length) {
    await prisma.debt.createMany({ data: data.debts.map((debt: { id: string; name: string; type: string; balance: number; interestRate: number; monthlyPayment: number }) => ({ id: debt.id, userId, name: debt.name, type: debt.type, balance: debt.balance, interestRate: debt.interestRate, monthlyPayment: debt.monthlyPayment })) });
  }
}

export async function deleteAllFinanceData(userId: string) {
  await prisma.$transaction([
    prisma.debt.deleteMany({ where: { userId } }),
    prisma.goal.deleteMany({ where: { userId } }),
    prisma.housing.deleteMany({ where: { userId } }),
    prisma.expense.deleteMany({ where: { userId } }),
    prisma.income.deleteMany({ where: { userId } }),
    prisma.profile.deleteMany({ where: { userId } }),
    prisma.scenario.deleteMany({ where: { userId } }),
    prisma.plan.deleteMany({ where: { userId } })
  ]);
}
