import {
  getLoanApplicationTotalIncome,
  getTotalDebt,
  getMonthlyDebtPayments,
  numberValue as toNumber
} from "@/lib/calculations/finance";
import { buildLoanReadinessProfile, type LoanReadinessPayload } from "@/lib/finance/loan-readiness-mapper";

const toText = (value: unknown, fallback = "") => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
};

export const CNB_MAPPING_AUDIT = true;

export function mapProfileToCNBApplication(profileData: LoanReadinessPayload) {
  const readiness = buildLoanReadinessProfile(profileData);
  const debts = profileData.debts ?? [];
  const debtPayments = getMonthlyDebtPayments(debts);
  const otherDebtBalances = getTotalDebt(debts, profileData.housingProfile ?? null);
  const incomeBreakdown = getLoanApplicationTotalIncome(
    profileData.profile ?? null,
    profileData.incomeSources ?? [],
    profileData.housingProfile ?? null,
    profileData.savingsProfile ?? null
  );

  const loanPayments = debts
    .filter((debt) => {
      const debtType = toText(debt.type).toLowerCase();
      return debtType.includes("loan") || debtType.includes("mortgage");
    })
    .reduce((acc, debt) => acc + toNumber(debt.monthly_payment), 0);

  const cardPayments = debts
    .filter((debt) => toText(debt.type).toLowerCase().includes("credit"))
    .reduce((acc, debt) => acc + toNumber(debt.monthly_payment), 0);

  const loans = debts
    .filter((debt) => toText(debt.type).toLowerCase().includes("loan"))
    .reduce((acc, debt) => acc + toNumber(debt.balance), 0);

  const creditCards = debts
    .filter((debt) => toText(debt.type).toLowerCase().includes("credit"))
    .reduce((acc, debt) => acc + toNumber(debt.balance), 0);

  const otherDebts = debts
    .filter((debt) => {
      const debtType = toText(debt.type).toLowerCase();
      return !debtType.includes("loan") && !debtType.includes("mortgage") && !debtType.includes("credit");
    })
    .reduce((acc, debt) => acc + toNumber(debt.balance), 0);

  // Canonical source order: assets
  const bankBalances = readiness.financials.savingsCash + readiness.financials.emergencyFund + readiness.financials.downPaymentSavings;
  const investments = readiness.financials.investments + readiness.financials.retirementSavings;
  const realEstate = readiness.housing.estimatedHomeValue;
  const vehicles = 0;
  const totalAssets = bankBalances + investments + realEstate + vehicles;

  // Canonical source order: liabilities
  const mortgages = readiness.housing.mortgageBalance;
  const totalLiabilities = mortgages + otherDebtBalances;
  const totalIncome = incomeBreakdown.totalIncome;
  const totalExpenses = readiness.financials.housingPayment + readiness.financials.nonHousingLivingExpenses + debtPayments;
  const disposableIncome = totalIncome - totalExpenses;
  const debtToIncome = totalIncome > 0 ? debtPayments / totalIncome : null;
  const housingRatio = totalIncome > 0 ? readiness.financials.housingPayment / totalIncome : null;
  const totalMonthlyPressure = totalIncome > 0 ? totalExpenses / totalIncome : null;

  return {
    customer: {
      name: readiness.applicant.name,
      dob: readiness.applicant.dateOfBirth,
      phone: readiness.applicant.phone,
      maritalStatus: toText(profileData.profile?.household_status),
      dependents: toNumber(profileData.profile?.dependents),
      nationality: readiness.applicant.nationality || toText(profileData.profile?.country_or_market),
      countryMarket: toText(profileData.profile?.country_or_market),
      address: readiness.applicant.physicalAddress,
      creditProfile: toText(profileData.profile?.credit_score_or_profile),
      housingStatus: readiness.housing.housingStatus,
      mortgageBalance: readiness.housing.mortgageBalance
    },
    employment: {
      employer: readiness.employment.employer,
      jobTitle: readiness.employment.jobTitle,
      lengthOfService: readiness.employment.employmentLength,
      income: incomeBreakdown.applicantIncome,
      employmentType: readiness.employment.employmentType,
      incomeStability: readiness.employment.incomeStability,
      incomeFrequency: readiness.employment.incomeFrequency,
      incomeType: toText(profileData.incomeSources?.[0]?.type),
      incomeLabel: toText(profileData.incomeSources?.[0]?.label)
    },
    banking: {
      primaryBanker: toText(profileData.profile?.primary_bank_name),
      accounts: toText(profileData.profile?.bank_accounts),
      creditCards: debts.filter((debt) => toText(debt.type).toLowerCase().includes("credit")).length
    },
    loan: {
      purpose: readiness.loan.loanPurpose,
      amountRequested: readiness.loan.requestedLoanAmount,
      purchasePrice: readiness.loan.purchasePrice,
      contribution: readiness.loan.downPaymentAvailable,
      securityValue: readiness.housing.estimatedHomeValue,
      targetSavingsGoal: toNumber(profileData.goals?.target_savings_goal),
      targetDebtReduction: toNumber(profileData.goals?.target_debt_reduction),
      targetMonthlyCashFlow: toNumber(profileData.goals?.target_monthly_cash_flow),
      goalTimeframe: toText(profileData.goals?.goal_timeframe)
    },
    debt: {
      name: toText(debts[0]?.name),
      type: toText(debts[0]?.type),
      balance: toNumber(debts[0]?.balance),
      interestRate: toNumber(debts[0]?.interest_rate),
      monthlyPayment: toNumber(debts[0]?.monthly_payment)
    },
    // Canonical source order: income
    income: {
      applicantIncome: incomeBreakdown.applicantIncome,
      rentalIncome: incomeBreakdown.rentalIncome,
      investmentIncome: incomeBreakdown.investmentIncome,
      otherIncome: incomeBreakdown.otherIncome,
      coApplicantIncome: incomeBreakdown.coApplicantIncome,
      totalIncome: incomeBreakdown.totalIncome,
      incomeSourcesUsed: incomeBreakdown.incomeSourcesUsed
    },
    // Canonical source order: expenses
    expenses: {
      housing: readiness.financials.housingPayment,
      loanPayments,
      creditCards: cardPayments,
      insurance: toNumber(profileData.expenseProfile?.insurance),
      food: toNumber(profileData.expenseProfile?.groceries),
      utilities: toNumber(profileData.expenseProfile?.utilities),
      transport: toNumber(profileData.expenseProfile?.transport),
      childcare: toNumber(profileData.expenseProfile?.childcare),
      discretionary: toNumber(profileData.expenseProfile?.discretionary),
      other: toNumber(profileData.expenseProfile?.other),
      livingExpensesExcludingHousingDebt: readiness.financials.nonHousingLivingExpenses,
      totalExpenses
    },
    assets: {
      bankBalances,
      investments,
      realEstate,
      vehicles,
      retirementSavings: readiness.financials.retirementSavings,
      downPaymentSavings: readiness.financials.downPaymentSavings,
      totalAssets
    },
    liabilities: {
      loans,
      mortgages,
      creditCards,
      otherDebts,
      totalLiabilities
    },
    summary: {
      netWorth: totalAssets - totalLiabilities,
      disposableIncome,
      debtToIncome: debtToIncome ? debtToIncome * 100 : 0,
      housingRatio: housingRatio ? housingRatio * 100 : 0,
      totalMonthlyPressure: totalMonthlyPressure ? totalMonthlyPressure * 100 : 0,
      runwayMonths: readiness.financials.savingsRunwayMonths ?? 0
    }
  };
}

export type CNBApplication = ReturnType<typeof mapProfileToCNBApplication>;
