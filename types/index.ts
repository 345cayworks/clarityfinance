export type CreditScoreRange = "300-579" | "580-669" | "670-739" | "740-799" | "800-850";
export type HousingStatus = "renting" | "homeowner" | "living_with_family" | "other";

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
  creditScoreRange: CreditScoreRange;
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
}
