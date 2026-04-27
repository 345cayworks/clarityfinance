import { toNumber } from "@/lib/finance/calculations";

type GenericRow = Record<string, unknown>;

type ProfilePayload = {
  profile: GenericRow | null;
  incomeSources: GenericRow[];
  expenseProfile: GenericRow | null;
  debts: GenericRow[];
  housingProfile: GenericRow | null;
  savingsProfile: GenericRow | null;
  goals: GenericRow | null;
};

const toText = (value: unknown, fallback = "") => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
};

const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

/**
 * Mapping audit table (Onboarding -> DB -> profile-get payload -> CNB field)
 * customerName -> profiles.customer_name -> profile.customer_name -> customer.name
 * dateOfBirth -> profiles.date_of_birth -> profile.date_of_birth -> customer.dob
 * physicalAddress -> profiles.physical_address -> profile.physical_address -> customer.address
 * phone -> profiles.phone -> profile.phone -> customer.phone
 * countryOrMarket -> profiles.country_or_market -> profile.country_or_market -> customer.countryMarket
 * dependents -> profiles.dependents -> profile.dependents -> customer.dependents
 * householdStatus -> profiles.household_status -> profile.household_status -> customer.maritalStatus
 * creditScoreOrProfile -> profiles.credit_score_or_profile -> profile.credit_score_or_profile -> customer.creditProfile
 * employmentType -> profiles.employment_type -> profile.employment_type -> employment.employmentType
 * employer -> profiles.employer -> profile.employer -> employment.employer
 * jobTitle -> profiles.job_title -> profile.job_title -> employment.jobTitle
 * incomeStability -> income_sources.stability -> incomeSources[0].stability -> employment.incomeStability
 * incomeFrequency -> income_sources.frequency -> incomeSources[0].frequency -> employment.incomeFrequency
 * incomeMonthlyAmount -> income_sources.monthly_amount -> incomeSources[0].monthly_amount -> income.applicantIncome
 * incomeType -> income_sources.type -> incomeSources[0].type -> employment.incomeType
 * incomeLabel -> income_sources.label -> incomeSources[0].label -> employment.incomeLabel
 */
export const CNB_MAPPING_AUDIT = true;

export function mapProfileToCNBApplication(profileData: ProfilePayload) {
  const profile = profileData.profile ?? {};
  const incomeSources = profileData.incomeSources ?? [];
  const primaryIncome = incomeSources[0] ?? {};
  const expenseProfile = profileData.expenseProfile ?? {};
  const debts = profileData.debts ?? [];
  const primaryDebt = debts[0] ?? {};
  const housing = profileData.housingProfile ?? {};
  const savings = profileData.savingsProfile ?? {};
  const goals = profileData.goals ?? {};

  const applicantIncome = toNumber(primaryIncome.monthly_amount);
  const rentalIncome = toNumber(housing.estimated_room_rental_income);
  const investmentIncome = toNumber(incomeSources.find((item) => toText(item.type).toLowerCase().includes("investment"))?.monthly_amount);
  const otherIncome = sum(incomeSources.slice(1).map((item) => toNumber(item.monthly_amount)));

  const housingExpense = toNumber(expenseProfile.housing) || toNumber(housing.mortgage_payment) || toNumber(housing.rent_amount);
  const loanPayments = debts.reduce((acc, debt) => {
    const debtType = toText(debt.type).toLowerCase();
    if (debtType.includes("loan") || debtType.includes("mortgage")) return acc + toNumber(debt.monthly_payment);
    return acc;
  }, 0);
  const cardPayments = debts.reduce((acc, debt) => {
    if (toText(debt.type).toLowerCase().includes("credit")) return acc + toNumber(debt.monthly_payment);
    return acc;
  }, 0);

  const incomeTotal = applicantIncome + rentalIncome + investmentIncome + otherIncome;
  const expensesTotal = sum([
    housingExpense,
    loanPayments,
    cardPayments,
    toNumber(expenseProfile.insurance),
    toNumber(expenseProfile.groceries),
    toNumber(expenseProfile.utilities),
    toNumber(expenseProfile.transport),
    toNumber(expenseProfile.other) + toNumber(expenseProfile.discretionary) + toNumber(expenseProfile.childcare)
  ]);

  const bankBalances = toNumber(savings.cash_savings) + toNumber(savings.emergency_fund);
  const investments = toNumber(savings.investments) + toNumber(savings.retirement_savings);
  const realEstate = toNumber(housing.estimated_home_value);
  const vehicles = 0;
  const totalAssets = bankBalances + investments + realEstate + vehicles;

  const loans = debts
    .filter((debt) => toText(debt.type).toLowerCase().includes("loan"))
    .reduce((acc, debt) => acc + toNumber(debt.balance), 0);
  const mortgages = toNumber(housing.mortgage_balance);
  const creditCards = debts
    .filter((debt) => toText(debt.type).toLowerCase().includes("credit"))
    .reduce((acc, debt) => acc + toNumber(debt.balance), 0);
  const otherDebts = debts
    .filter((debt) => {
      const debtType = toText(debt.type).toLowerCase();
      return !debtType.includes("loan") && !debtType.includes("mortgage") && !debtType.includes("credit");
    })
    .reduce((acc, debt) => acc + toNumber(debt.balance), 0);
  const totalLiabilities = loans + mortgages + creditCards + otherDebts;

  const disposableIncome = incomeTotal - expensesTotal;
  const netWorth = totalAssets - totalLiabilities;
  const debtToIncome = incomeTotal > 0 ? ((loanPayments + cardPayments) / incomeTotal) * 100 : 0;
  const housingRatio = incomeTotal > 0 ? (housingExpense / incomeTotal) * 100 : 0;
  const runwayMonths = expensesTotal > 0 ? bankBalances / expensesTotal : 0;

  return {
    customer: {
      name: toText(profile.customer_name, toText(profile.email, "")),
      dob: toText(profile.date_of_birth),
      phone: toText(profile.phone),
      maritalStatus: toText(profile.household_status),
      dependents: toNumber(profile.dependents),
      nationality: toText(profile.nationality, toText(profile.country_or_market)),
      countryMarket: toText(profile.country_or_market),
      address: toText(profile.physical_address),
      creditProfile: toText(profile.credit_score_or_profile),
      housingStatus: toText(housing.housing_status),
      mortgageBalance: toNumber(housing.mortgage_balance)
    },
    employment: {
      employer: toText(profile.employer),
      jobTitle: toText(profile.job_title),
      lengthOfService: toText(profile.employment_length, toText(profile.length_of_service)),
      income: applicantIncome,
      employmentType: toText(profile.employment_type),
      incomeStability: toText(primaryIncome.stability),
      incomeFrequency: toText(primaryIncome.frequency),
      incomeType: toText(primaryIncome.type),
      incomeLabel: toText(primaryIncome.label)
    },
    banking: {
      primaryBanker: toText(profile.primary_bank_name, toText(profile.primary_banker)),
      accounts: toText(profile.bank_accounts),
      creditCards: debts.filter((debt) => toText(debt.type).toLowerCase().includes("credit")).length
    },
    loan: {
      purpose: toText(profile.loan_purpose, toText(goals.target_goal)),
      amountRequested: toNumber(profile.requested_loan_amount) || toNumber(goals.target_home_price),
      purchasePrice: toNumber(goals.target_home_price),
      contribution: toNumber(savings.down_payment_savings),
      securityValue: toNumber(housing.estimated_home_value),
      targetSavingsGoal: toNumber(goals.target_savings_goal),
      targetDebtReduction: toNumber(goals.target_debt_reduction),
      targetMonthlyCashFlow: toNumber(goals.target_monthly_cash_flow),
      goalTimeframe: toText(goals.goal_timeframe)
    },
    debt: {
      name: toText(primaryDebt.name),
      type: toText(primaryDebt.type),
      balance: toNumber(primaryDebt.balance),
      interestRate: toNumber(primaryDebt.interest_rate),
      monthlyPayment: toNumber(primaryDebt.monthly_payment)
    },
    income: {
      applicantIncome,
      rentalIncome,
      investmentIncome,
      otherIncome,
      totalIncome: incomeTotal
    },
    expenses: {
      housing: housingExpense,
      loanPayments,
      creditCards: cardPayments,
      insurance: toNumber(expenseProfile.insurance),
      food: toNumber(expenseProfile.groceries),
      utilities: toNumber(expenseProfile.utilities),
      transport: toNumber(expenseProfile.transport),
      childcare: toNumber(expenseProfile.childcare),
      discretionary: toNumber(expenseProfile.discretionary),
      other: toNumber(expenseProfile.other),
      totalExpenses: expensesTotal
    },
    assets: {
      bankBalances,
      investments,
      realEstate,
      vehicles,
      retirementSavings: toNumber(savings.retirement_savings),
      downPaymentSavings: toNumber(savings.down_payment_savings),
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
      debtToIncome: incomeTotal > 0 ? ((loanPayments + cardPayments) / incomeTotal) * 100 : 0,
      housingRatio: incomeTotal > 0 ? (housingExpense / incomeTotal) * 100 : 0,
      runwayMonths: expensesTotal > 0 ? bankBalances / expensesTotal : 0
    }
  };
}

export type CNBApplication = ReturnType<typeof mapProfileToCNBApplication>;
