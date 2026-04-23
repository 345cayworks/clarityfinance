import { getPrisma } from "@/lib/db/prisma";
const prisma = getPrisma();
import { defaultFinanceData } from "@/lib/storage";
import { FinanceData } from "@/types";

async function getOrCreateUser(externalId: string) {
  return prisma.user.upsert({ where: { externalId }, update: {}, create: { externalId } });
}

export async function getFinanceDataByExternalUserId(externalId: string): Promise<FinanceData> {
  const user = await getOrCreateUser(externalId);
  const [profile, income, expense, housing, goal, debts] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.income.findUnique({ where: { userId: user.id } }),
    prisma.expense.findUnique({ where: { userId: user.id } }),
    prisma.housing.findUnique({ where: { userId: user.id } }),
    prisma.goal.findUnique({ where: { userId: user.id } }),
    prisma.debt.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } })
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
    debts: debts.map((debt: any) => ({ id: debt.id, name: debt.name, type: debt.type, balance: debt.balance, interestRate: debt.interestRate, monthlyPayment: debt.monthlyPayment }))
  };
}

export async function upsertFinanceData(externalId: string, data: FinanceData) {
  const user = await getOrCreateUser(externalId);

  await prisma.$transaction([
    prisma.profile.upsert({ where: { userId: user.id }, update: { countryOrMarket: data.countryOrMarket, preferredCurrency: data.preferredCurrency, ageRange: data.ageRange, employmentType: data.employmentType, householdStatus: data.householdStatus, dependents: data.dependents, creditScoreKnown: data.creditScoreKnown, creditScoreOrProfile: data.creditScoreRange }, create: { userId: user.id, countryOrMarket: data.countryOrMarket, preferredCurrency: data.preferredCurrency, ageRange: data.ageRange, employmentType: data.employmentType, householdStatus: data.householdStatus, dependents: data.dependents, creditScoreKnown: data.creditScoreKnown, creditScoreOrProfile: data.creditScoreRange } }),
    prisma.income.upsert({ where: { userId: user.id }, update: { monthlyIncome: data.monthlyIncome, otherIncome: data.otherIncome, incomeFrequency: data.incomeFrequency, incomeStability: data.incomeStability, rentalIncome: data.rentalIncome, sideIncome: data.sideIncome }, create: { userId: user.id, monthlyIncome: data.monthlyIncome, otherIncome: data.otherIncome, incomeFrequency: data.incomeFrequency, incomeStability: data.incomeStability, rentalIncome: data.rentalIncome, sideIncome: data.sideIncome } }),
    prisma.expense.upsert({ where: { userId: user.id }, update: { monthlyExpenses: data.monthlyExpenses, monthlyHousingCost: data.monthlyHousingCost, utilities: data.utilities, transport: data.transport, groceries: data.groceries, insurance: data.insurance, childcare: data.childcare, discretionarySpending: data.discretionarySpending }, create: { userId: user.id, monthlyExpenses: data.monthlyExpenses, monthlyHousingCost: data.monthlyHousingCost, utilities: data.utilities, transport: data.transport, groceries: data.groceries, insurance: data.insurance, childcare: data.childcare, discretionarySpending: data.discretionarySpending } }),
    prisma.housing.upsert({ where: { userId: user.id }, update: { housingStatus: data.housingStatus, rentAmount: data.rentAmount, mortgageBalance: data.mortgageBalance, mortgageRate: data.mortgageRate, mortgagePayment: data.mortgagePayment, estimatedHomeValue: data.estimatedHomeValue, spareRoomAvailable: data.spareRoomAvailable, estimatedRoomRentalIncome: data.estimatedRoomRentalIncome }, create: { userId: user.id, housingStatus: data.housingStatus, rentAmount: data.rentAmount, mortgageBalance: data.mortgageBalance, mortgageRate: data.mortgageRate, mortgagePayment: data.mortgagePayment, estimatedHomeValue: data.estimatedHomeValue, spareRoomAvailable: data.spareRoomAvailable, estimatedRoomRentalIncome: data.estimatedRoomRentalIncome } }),
    prisma.goal.upsert({ where: { userId: user.id }, update: { targetGoal: data.targetGoal, targetHomePrice: data.targetHomePrice, targetSavingsGoal: data.targetSavingsGoal, targetDebtReduction: data.targetDebtReduction, targetMonthlyCashFlow: data.targetMonthlyCashFlow, goalTimeframe: data.goalTimeframe }, create: { userId: user.id, targetGoal: data.targetGoal, targetHomePrice: data.targetHomePrice, targetSavingsGoal: data.targetSavingsGoal, targetDebtReduction: data.targetDebtReduction, targetMonthlyCashFlow: data.targetMonthlyCashFlow, goalTimeframe: data.goalTimeframe } })
  ]);

  await prisma.debt.deleteMany({ where: { userId: user.id } });
  if (data.debts.length) {
    await prisma.debt.createMany({ data: data.debts.map((debt: any) => ({ id: debt.id, userId: user.id, name: debt.name, type: debt.type, balance: debt.balance, interestRate: debt.interestRate, monthlyPayment: debt.monthlyPayment })) });
  }
}

export async function deleteAllFinanceData(externalId: string) {
  const user = await prisma.user.findUnique({ where: { externalId } });
  if (!user) return;
  await prisma.user.delete({ where: { id: user.id } });
}
