export type CreditScoreRange = "300-579" | "580-669" | "670-739" | "740-799" | "800-850";
export type HousingStatus = "renting" | "owning" | "with_family";

export interface Debt {
  id?: string;
  name: string;
  balance: number;
  interestRate: number;
  monthlyPayment: number;
}

export interface FinancialProfile {
  userId?: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  savings: number;
  creditScoreRange: CreditScoreRange;
  housingStatus: HousingStatus;
}

export interface ScenarioInput {
  incomeDelta: number;
  debtReduction: number;
  rentalIncome: number;
  interestRateReduction: number;
}

export interface PlanStep {
  title: string;
  detail: string;
}
