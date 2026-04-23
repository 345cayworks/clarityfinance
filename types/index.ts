export type AppRole = "user" | "advisor" | "admin";
export type CreditScoreRange = "300-579" | "580-669" | "670-739" | "740-799" | "800-850";
export type CreditProfile = CreditScoreRange | "not_provided";
export type HousingStatus = "renting" | "homeowner" | "living_with_family" | "other";
export type CountryOrMarket = "United States" | "Cayman Islands" | "Jamaica" | "Dominican Republic" | "Other";
export type CurrencyCode = "USD" | "KYD" | "JMD" | "DOP" | "Other";
export type EmploymentType = "full_time" | "part_time" | "self_employed" | "contract" | "unemployed" | "retired";
export type TargetGoal = "buy_home" | "refinance_home" | "reduce_debt" | "grow_savings" | "improve_cash_flow";

export interface DebtItem {
  id: string;
  name: string;
  type: string;
  balance: number;
  interestRate: number;
  monthlyPayment: number;
}

export interface FinanceData {
  countryOrMarket: CountryOrMarket;
  preferredCurrency: CurrencyCode;
  ageRange: string;
  employmentType: EmploymentType;
  householdStatus: string;
  dependents: number;
  creditScoreKnown: boolean;
  creditScoreRange: CreditProfile;

  monthlyIncome: number;
  otherIncome: number;
  incomeFrequency: string;
  incomeStability: string;
  rentalIncome: number;
  sideIncome: number;

  monthlyExpenses: number;
  monthlyHousingCost: number;
  utilities: number;
  transport: number;
  groceries: number;
  insurance: number;
  childcare: number;
  discretionarySpending: number;

  housingStatus: HousingStatus;
  rentAmount: number;
  mortgageBalance: number;
  mortgageRate: number;
  mortgagePayment: number;
  estimatedHomeValue: number;
  spareRoomAvailable: boolean;
  estimatedRoomRentalIncome: number;

  savings: number;
  targetGoal: TargetGoal;
  targetHomePrice: number;
  targetSavingsGoal: number;
  targetDebtReduction: number;
  targetMonthlyCashFlow: number;
  goalTimeframe: string;

  debts: DebtItem[];
}

export interface ScenarioAdjustments {
  incomeIncrease: number;
  expenseReduction: number;
  debtPayoffAmount: number;
  lowerMortgageRateBy: number;
  addRoomRentalIncome: number;
  savingsRateBoost: number;
  lowerHousingCost: number;
}


export interface SavedScenario {
  id: string;
  name: string;
  adjustments: ScenarioAdjustments;
  createdAt: string;
  updatedAt: string;
}

export interface SavedPlan {
  id: string;
  name: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
