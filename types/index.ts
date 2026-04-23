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
  balance: number;
  interestRate: number;
  monthlyPayment: number;
}

export interface FinanceData {
  monthlyIncome: number;
  otherIncome: number;
  monthlyExpenses: number;
  savings: number;
  countryOrMarket: CountryOrMarket;
  preferredCurrency: CurrencyCode;
  employmentType: EmploymentType;
  dependents: number;
  targetGoal: TargetGoal;
  monthlyHousingCost: number;
  creditScoreRange: CreditProfile;
  housingStatus: HousingStatus;
  mortgageBalance: number;
  mortgageRate: number;
  mortgagePayment: number;
  rentAmount: number;
  estimatedRoomRentalIncome: number;
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
