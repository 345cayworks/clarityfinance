import {
  housingPayment,
  monthlyDebtPayments,
  savingsRunwayMonths,
  toNumber,
  totalExpenses,
  totalIncome
} from "@/lib/finance/calculations";

type GenericRow = Record<string, unknown>;

export type LoanReadinessPayload = {
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

const toBool = (value: unknown) => value === true || String(value).toLowerCase() === "true";

export function buildLoanReadinessProfile(data: LoanReadinessPayload) {
  const profile = data.profile ?? {};
  const incomeSources = data.incomeSources ?? [];
  const debts = data.debts ?? [];
  const housing = data.housingProfile ?? {};
  const savings = data.savingsProfile ?? {};
  const goals = data.goals ?? {};

  const recurringIncomeTotal = totalIncome(incomeSources);
  const monthlyNetIncome = toNumber(profile.monthly_net_income);
  const monthlyGrossIncome = toNumber(profile.monthly_gross_income);
  const monthlyIncomeUsed = monthlyNetIncome > 0 ? monthlyNetIncome : monthlyGrossIncome > 0 ? monthlyGrossIncome : recurringIncomeTotal;
  const monthlyIncomeSource = monthlyNetIncome > 0 ? "profiles.monthly_net_income" : monthlyGrossIncome > 0 ? "profiles.monthly_gross_income" : "income_sources.monthly_amount";

  const monthlyExpenses = totalExpenses(data.expenseProfile ?? null);
  const monthlyHousingPayment = housingPayment(data.housingProfile ?? null);
  const debtPayments = monthlyDebtPayments(debts);
  const totalDebt = debts.reduce((sum, debt) => sum + toNumber(debt.balance), 0);
  const monthlySurplus = monthlyIncomeUsed - monthlyExpenses - monthlyHousingPayment - debtPayments;

  const cashSavings = toNumber(savings.cash_savings);
  const emergencyFund = toNumber(savings.emergency_fund);
  const downPaymentSavings = toNumber(savings.down_payment_savings);
  const downPaymentAvailable = toNumber(profile.down_payment_available) || downPaymentSavings;
  const purchasePrice = toNumber(profile.purchase_price) || toNumber(goals.target_home_price);
  const requestedLoanAmount = toNumber(profile.requested_loan_amount) || Math.max(purchasePrice - downPaymentAvailable, 0);

  const rentAmount = toNumber(housing.rent_amount);
  const mortgagePayment = toNumber(housing.mortgage_payment);

  const estimatedHomeValue = toNumber(housing.estimated_home_value);
  const mortgageBalance = toNumber(housing.mortgage_balance);
  const equity = estimatedHomeValue - mortgageBalance;

  const downPaymentPercent = purchasePrice > 0 ? downPaymentAvailable / purchasePrice : 0;
  const loanToValue = purchasePrice > 0 ? requestedLoanAmount / purchasePrice : null;

  const debtToIncome = monthlyIncomeUsed > 0 ? debtPayments / monthlyIncomeUsed : null;
  const housingRatio = monthlyIncomeUsed > 0 ? monthlyHousingPayment / monthlyIncomeUsed : null;
  const runwayMonths = savingsRunwayMonths(data.savingsProfile ?? null, data.expenseProfile ?? null);

  return {
    applicant: {
      name: toText(profile.customer_name),
      dateOfBirth: toText(profile.date_of_birth),
      phone: toText(profile.phone),
      email: toText(profile.email),
      physicalAddress: toText(profile.physical_address),
      mailingAddress: toText(profile.mailing_address),
      nationality: toText(profile.nationality),
      citizenshipStatus: toText(profile.citizenship_status),
      workPermitRequired: toBool(profile.work_permit_required),
      workPermitExpiryDate: toText(profile.work_permit_expiry_date)
    },
    employment: {
      employmentType: toText(profile.employment_type),
      employer: toText(profile.employer),
      jobTitle: toText(profile.job_title),
      employmentLength: toText(profile.employment_length),
      employerAddress: toText(profile.employer_address),
      incomeFrequency: toText(incomeSources[0]?.frequency),
      incomeStability: toText(incomeSources[0]?.stability)
    },
    financials: {
      monthlyGrossIncome,
      monthlyNetIncome,
      monthlyIncomeUsed,
      monthlyIncomeSource,
      monthlyExpenses,
      housingPayment: monthlyHousingPayment,
      monthlyDebtPayments: debtPayments,
      monthlySurplus,
      totalDebt,
      savingsCash: cashSavings,
      emergencyFund,
      downPaymentSavings,
      investments: toNumber(savings.investments),
      retirementSavings: toNumber(savings.retirement_savings),
      savingsRunwayMonths: runwayMonths
    },
    housing: {
      housingStatus: toText(housing.housing_status),
      rentAmount,
      mortgageBalance,
      mortgagePayment,
      mortgageRate: toNumber(housing.mortgage_rate),
      estimatedHomeValue,
      equity,
      estimatedRoomRentalIncome: toNumber(housing.estimated_room_rental_income)
    },
    loan: {
      loanPurpose: toText(profile.loan_purpose, toText(goals.target_goal)),
      requestedLoanAmount,
      desiredLoanTermYears: toNumber(profile.desired_loan_term_years),
      purchasePrice,
      downPaymentAvailable,
      downPaymentPercent,
      loanToValue,
      propertyType: toText(profile.property_type),
      propertyLocation: toText(profile.property_location),
      propertyIdentified: toBool(profile.property_identified),
      purchaseAgreementAvailable: toBool(profile.purchase_agreement_available)
    },
    documents: {
      hasID: toBool(profile.has_id),
      hasProofOfAddress: toBool(profile.has_proof_of_address),
      hasPayslips: toBool(profile.has_payslips),
      hasEmploymentLetter: toBool(profile.has_employment_letter),
      hasBankStatements: toBool(profile.has_bank_statements),
      hasDebtStatements: toBool(profile.has_debt_statements),
      hasCreditReport: toBool(profile.has_credit_report),
      hasPurchaseAgreement: toBool(profile.has_purchase_agreement),
      hasValuation: toBool(profile.has_valuation),
      hasDownPaymentProof: toBool(profile.has_down_payment_proof),
      hasBusinessFinancials: toBool(profile.has_business_financials)
    },
    ratios: {
      debtToIncome,
      housingRatio,
      loanToValue,
      savingsRunwayMonths: runwayMonths
    }
  };
}

export type LoanReadinessProfile = ReturnType<typeof buildLoanReadinessProfile>;
